/**
 * Image intake rules for the split cell's composer.
 *
 * The composer turns a browser `File` into the prompt part the Session RPC
 * accepts — `{ type: 'image', mediaType, data: '<base64 without the data: prefix>' }`
 * (PromptContentPart in the DSH client contract). The only piece that needs a
 * browser is the base64 encode (FileReader), so the encode is injected and every
 * rule that decides "is this usable, and how many fit" stays pure and testable
 * in Node without a DOM or React.
 *
 * The Host owns the real intake budget (bytes, pixels, dimensions, queue
 * admission) and answers a refused prompt with a failure RemoteResult. The
 * checks here only keep obviously unusable files out of the queue, so the reader
 * reads a local message instead of waiting for a send that cannot succeed.
 */

/** The four raster types the Session prompt endpoint accepts. */
export const IMAGE_MEDIA_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

/**
 * Precheck budget, aligned with the Host's default image count.
 *
 * The Host owns every real limit (count, bytes, pixels, dimension, model
 * modality) and refuses a prompt that breaks one with its own error, which the
 * composer shows verbatim. Only the count is re-checked here: it is the one
 * limit a reader can hit while picking files, and failing locally avoids
 * encoding and sending a batch that cannot be admitted. Repeating the default
 * (rather than reading the per-session `imageLimits` projection) keeps the
 * composer synchronous; a deployment with a different budget still answers
 * through the Host's error.
 */
export const IMAGE_INTAKE_LIMITS = Object.freeze({
  maxImages: 20,
})

/** Chunk of bytes converted per `String.fromCharCode` call (stack safety). */
const BASE64_CHUNK = 0x8000

/**
 * Whitelisted media type for a browser-declared MIME value.
 *
 * Browsers sometimes hand over an empty or mixed-case `file.type` (a screenshot
 * pasted from another app can arrive without one); normalizing here keeps the
 * accepted set identical no matter the source.
 * @param value - browser-declared MIME type.
 * @returns one of IMAGE_MEDIA_TYPES, or '' when the type is not accepted.
 */
export function imageMediaType(value) {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return IMAGE_MEDIA_TYPES.includes(type) ? type : ''
}

/** File name of a browser File, or '' when the source has none. */
function fileName(file) {
  return typeof file?.name === 'string' ? file.name : ''
}

/** Positive image count budget, falling back to the documented default. */
function imageCountLimit(limits) {
  const value = limits?.maxImages
  return Number.isInteger(value) && value > 0 ? value : IMAGE_INTAKE_LIMITS.maxImages
}

/**
 * Why one file cannot join the draft, or null when it can.
 *
 * Media type and count only: bytes and pixels belong to the Host, which answers
 * a refused admission with a code and message the composer displays.
 * @param file - browser File.
 * @param count - images the draft already holds (including accepted ones).
 * @param maxImages - count budget.
 * @returns `{ reason, name }`, where reason is 'unsupported-type' | 'too-many'.
 */
function rejectReason(file, count, maxImages) {
  if (imageMediaType(file?.type) === '') return { reason: 'unsupported-type', name: fileName(file) }
  if (count >= maxImages) return { reason: 'too-many', name: fileName(file) }
  return null
}

/**
 * Split incoming files into what the draft can take right now.
 *
 * Rejections are reported per file rather than failing the whole drop: dragging
 * a folder of screenshots should still queue the supported ones, exactly like a
 * single unsupported file must not silently disappear.
 * @param files - browser Files from a picker, paste, or drop.
 * @param existingCount - images already in the draft.
 * @param limits - optional `{ maxImages }` override.
 * @returns `{ accepted: [{ file, mediaType }], rejected: [{ reason, name }] }`.
 */
export function intakeImages(files, existingCount, limits = IMAGE_INTAKE_LIMITS) {
  const list = Array.isArray(files) ? files : []
  const maxImages = imageCountLimit(limits)
  const start = Number.isInteger(existingCount) && existingCount > 0 ? existingCount : 0
  const accepted = []
  const rejected = []
  let count = start
  for (const file of list) {
    const rejection = rejectReason(file, count, maxImages)
    if (rejection !== null) {
      rejected.push(rejection)
      continue
    }
    accepted.push({ file, mediaType: imageMediaType(file?.type) })
    count += 1
  }
  return { accepted, rejected }
}

/**
 * One prompt image part from a browser File.
 * @param file - browser File.
 * @param encode - async `(file) => base64 payload`; injected so tests need no
 *   FileReader (the browser passes its native data-URL reader).
 * @returns the PromptContentPart for this image.
 */
export async function imagePart(file, encode) {
  const mediaType = imageMediaType(file?.type)
  if (mediaType === '') throw new TypeError('unsupported image media type')
  const data = await encode(file)
  if (typeof data !== 'string' || data === '') {
    throw new TypeError('image encoder returned no base64 payload')
  }
  const part = { type: 'image', mediaType, data }
  const name = fileName(file)
  // The optional name is omitted rather than sent empty: a pasted screenshot has
  // no file name, and "" would label the attachment in the durable log.
  if (name !== '') part.name = name
  return part
}

/**
 * Base64 payload of a FileReader data URL.
 *
 * `readAsDataURL` returns `data:<type>;base64,<payload>`; the prompt part wants
 * the payload only. Splitting on the first comma also survives a media type the
 * browser spelled differently from the part's own mediaType.
 * @param dataUrl - FileReader result.
 * @returns base64 text without the prefix.
 */
export function dataUrlPayload(dataUrl) {
  const comma = typeof dataUrl === 'string' ? dataUrl.indexOf(',') : -1
  if (comma < 0) throw new TypeError('image encoder returned no data URL')
  return dataUrl.slice(comma + 1)
}

/**
 * Prompt parts for one send: the images in the order the reader added them, then
 * the text block (when any was typed).
 *
 * The order copies the harness's own composer (`sendSession` serializes
 * attachments first, then appends the text part), so a message that travelled
 * through a split cell reads the same way in the official transcript. One
 * `prompt` call carries the whole list; sending text and images separately would
 * let the Host admit them as two messages and reorder the reader's intent.
 * @param text - draft text.
 * @param images - image parts, in draft order.
 * @returns ordered PromptContentPart list.
 */
export function buildPromptParts(text, images) {
  const parts = []
  for (const image of Array.isArray(images) ? images : []) {
    if (image?.type === 'image') parts.push(image)
  }
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed !== '') parts.push({ type: 'text', text: trimmed })
  return parts
}

/**
 * Base64 of raw bytes, used when `URL.createObjectURL` is unavailable.
 *
 * The fallback mirrors what the harness's own conversation service does: a
 * `data:` URL still renders, so a browser without Blob URLs shows the image
 * instead of an empty box.
 * @param bytes - Uint8Array (or array-like) of image bytes.
 * @returns base64 text.
 */
export function bytesToBase64(bytes) {
  const list = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes ?? [])
  let binary = ''
  for (let at = 0; at < list.length; at += BASE64_CHUNK) {
    binary += String.fromCharCode(...list.subarray(at, at + BASE64_CHUNK))
  }
  return btoa(binary)
}
