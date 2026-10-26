/**
 * Composer image rules.
 *
 * The composer is the only place a reader can add a picture to a split cell, and
 * everything it decides before calling `session.prompt` lives in
 * composer-images.js so it can be tested here without a DOM: which MIME types
 * are accepted, what a rejected drop reports, the order of the prompt parts, and
 * the base64 shapes the Session RPC expects.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMAGE_INTAKE_LIMITS,
  IMAGE_MEDIA_TYPES,
  buildPromptParts,
  bytesToBase64,
  dataUrlPayload,
  imageMediaType,
  imagePart,
  intakeImages,
} from '../packages/dsh-workspace-split/src/composer-images.js'

/** A browser-File stand-in: the composer only reads type, name, and size. */
function fileOf(type, name = 'shot.png', size = 1024) {
  return { type, name, size }
}

describe('imageMediaType', () => {
  it('accepts exactly the four raster types the prompt API documents', () => {
    assert.deepEqual(IMAGE_MEDIA_TYPES, ['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
    for (const type of IMAGE_MEDIA_TYPES) assert.equal(imageMediaType(type), type)
  })

  it('normalizes case and surrounding space', () => {
    // A clipboard image can arrive with a mixed-case or padded MIME value; the
    // prompt part must still carry the canonical spelling.
    assert.equal(imageMediaType(' Image/PNG '), 'image/png')
  })

  it('rejects SVG, empty, and non-string values', () => {
    assert.equal(imageMediaType('image/svg+xml'), '')
    assert.equal(imageMediaType(''), '')
    assert.equal(imageMediaType(undefined), '')
    assert.equal(imageMediaType(42), '')
  })
})

describe('intakeImages', () => {
  it('accepts supported images and keeps their order', () => {
    const files = [fileOf('image/png', 'a.png'), fileOf('image/gif', 'b.gif')]
    const { accepted, rejected } = intakeImages(files, 0)
    assert.deepEqual(
      accepted.map((entry) => [entry.mediaType, entry.file.name]),
      [
        ['image/png', 'a.png'],
        ['image/gif', 'b.gif'],
      ],
    )
    assert.deepEqual(rejected, [])
  })

  it('reports an unsupported file instead of dropping it silently', () => {
    const { accepted, rejected } = intakeImages([fileOf('image/svg+xml', 'logo.svg')], 0)
    assert.deepEqual(accepted, [])
    assert.deepEqual(rejected, [{ reason: 'unsupported-type', name: 'logo.svg' }])
  })

  it('keeps the supported files of a mixed drop', () => {
    const { accepted, rejected } = intakeImages(
      [fileOf('image/png', 'ok.png'), fileOf('text/plain', 'notes.txt')],
      0,
    )
    assert.deepEqual(
      accepted.map((entry) => entry.file.name),
      ['ok.png'],
    )
    assert.deepEqual(rejected, [{ reason: 'unsupported-type', name: 'notes.txt' }])
  })

  it('counts the images already in the draft against the limit', () => {
    const files = [fileOf('image/png', 'a.png'), fileOf('image/png', 'b.png')]
    const { accepted, rejected } = intakeImages(files, 1, { maxImages: 2 })
    assert.deepEqual(
      accepted.map((entry) => entry.file.name),
      ['a.png'],
    )
    assert.deepEqual(rejected, [{ reason: 'too-many', name: 'b.png' }])
  })

  it('leaves bytes and pixels to the Host', () => {
    // The prompt endpoint owns the byte/pixel limits and refuses with its own
    // code and message; a local byte check would disagree with a deployment that
    // configured a different budget, which is why only the count is prechecked.
    const huge = fileOf('image/png', 'huge.png', 512 * 1024 * 1024)
    const { accepted, rejected } = intakeImages([huge], 0)
    assert.deepEqual(
      accepted.map((entry) => entry.file.name),
      ['huge.png'],
    )
    assert.deepEqual(rejected, [])
  })

  it('falls back to the documented budget for junk limits', () => {
    const { accepted } = intakeImages([fileOf('image/png')], 0, {
      maxImages: 'x',
    })
    assert.equal(accepted.length, 1)
    assert.equal(IMAGE_INTAKE_LIMITS.maxImages > 0, true)
  })

  it('tolerates a missing list', () => {
    assert.deepEqual(intakeImages(undefined, 0), { accepted: [], rejected: [] })
  })
})

describe('imagePart', () => {
  it('builds the prompt part with base64 bytes and the file name', async () => {
    const part = await imagePart(fileOf('image/png', 'shot.png'), async () => 'QUJD')
    assert.deepEqual(part, {
      type: 'image',
      mediaType: 'image/png',
      data: 'QUJD',
      name: 'shot.png',
    })
  })

  it('omits an empty name: a pasted screenshot has no file name', async () => {
    const part = await imagePart(fileOf('image/jpeg', ''), async () => 'QUJD')
    assert.equal('name' in part, false)
  })

  it('refuses an unsupported type before encoding anything', async () => {
    let encoded = false
    await assert.rejects(
      imagePart(fileOf('image/bmp'), async () => {
        encoded = true
        return 'QUJD'
      }),
      /unsupported image media type/,
    )
    assert.equal(encoded, false, 'the encoder must not run for a refused file')
  })

  it('rejects an encoder that produced nothing', async () => {
    await assert.rejects(
      imagePart(fileOf('image/png'), async () => ''),
      /no base64 payload/,
    )
  })

  it('propagates a read failure so the composer can show it', async () => {
    await assert.rejects(
      imagePart(fileOf('image/png'), async () => {
        throw new Error('read failed')
      }),
      /read failed/,
    )
  })
})

describe('dataUrlPayload', () => {
  it('keeps only the base64 after the first comma', () => {
    assert.equal(dataUrlPayload('data:image/png;base64,QUJD'), 'QUJD')
  })

  it('rejects a result that is not a data URL', () => {
    assert.throws(() => dataUrlPayload('QUJD'), /no data URL/)
    assert.throws(() => dataUrlPayload(undefined), /no data URL/)
  })
})

describe('buildPromptParts', () => {
  const image = { type: 'image', mediaType: 'image/png', data: 'QUJD' }

  it('puts the images first, then the text, matching the harness composer', () => {
    const second = { type: 'image', mediaType: 'image/gif', data: 'REVG' }
    assert.deepEqual(buildPromptParts('  look  ', [image, second]), [
      image,
      second,
      { type: 'text', text: 'look' },
    ])
  })

  it('sends an image-only prompt without an empty text block', () => {
    // The old composer required non-empty text, so a screenshot alone could not
    // be sent; the image is a valid message on its own.
    assert.deepEqual(buildPromptParts('   ', [image]), [image])
  })

  it('sends a text-only prompt unchanged', () => {
    assert.deepEqual(buildPromptParts('hi', []), [{ type: 'text', text: 'hi' }])
  })

  it('returns nothing when the draft is empty and ignores non-image junk', () => {
    assert.deepEqual(buildPromptParts('', []), [])
    assert.deepEqual(buildPromptParts('', [{ type: 'text', text: 'x' }]), [])
    assert.deepEqual(buildPromptParts(undefined, undefined), [])
  })
})

describe('bytesToBase64', () => {
  it('encodes bytes the browser can decode again', () => {
    assert.equal(bytesToBase64(Uint8Array.from([65, 66, 67])), 'QUJD')
  })

  it('encodes an empty buffer as an empty string', () => {
    assert.equal(bytesToBase64(new Uint8Array(0)), '')
    assert.equal(bytesToBase64(undefined), '')
  })

  it('survives a payload larger than one fromCharCode chunk', () => {
    // 40 KiB crosses the 32 KiB chunk boundary; a single spread would throw a
    // RangeError for the largest admitted image.
    const bytes = new Uint8Array(40 * 1024).fill(65)
    const base64 = bytesToBase64(bytes)
    assert.equal(base64.length, Math.ceil(bytes.length / 3) * 4)
    assert.match(base64, /^QUFB/)
  })
})
