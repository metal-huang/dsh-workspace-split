/**
 * Placement math for the sidebar control.
 *
 * The `sidebar.footer.action` slot renders its entries in a row of its own,
 * above the account row, and each entry sits behind wrapper elements that the
 * slot system styles with `display: contents`. Those wrappers have no box, so
 * layout skips them — and so does `nextElementSibling` as a way to find the
 * row: the element next to this control in the DOM is another entry's wrapper
 * (or nothing), never the account row. The control has to walk up to the first
 * ancestor that participates in layout before it can look at siblings.
 *
 * How far down the account row sits is owned by the shell — its font scale, its
 * padding, and whatever else the footer holds — so a constant offset only lines
 * up by accident: at 40px the split control floated between the footer icons and
 * the account row. The client measures the two boxes and translates by this
 * offset instead.
 *
 * Kept free of React and DOM so the arithmetic can be tested directly.
 */

/** Display value that takes an element out of the layout tree. */
const NO_BOX = 'contents'

/**
 * Nearest ancestor that participates in layout.
 * @param node - element to start from.
 * @param displayOf - computed `display` reader (injectable for tests).
 * @returns the first ancestor with a box, or null.
 */
export function layoutContainer(node, displayOf) {
  if (node === null || node === undefined) return null
  let el = node.parentElement ?? null
  while (el !== null && displayOf(el) === NO_BOX) el = el.parentElement ?? null
  return el
}

/**
 * The account row that follows the control's footer row.
 * @param control - the control's button.
 * @param displayOf - computed `display` reader (injectable for tests).
 * @returns the row element, or null when the shell's footer has another shape.
 */
export function accountRowOf(control, displayOf) {
  const container = layoutContainer(control, displayOf)
  return container?.nextElementSibling ?? null
}

/**
 * Vertical offset that centres one box on another.
 * @param self - the control's viewport rect, measured without its own transform.
 * @param row - the target row's viewport rect.
 * @returns CSS pixels to translate the control down by; 0 when either box is unlaid-out.
 */
export function centerOffset(self, row) {
  if (self === null || row === null || self === undefined || row === undefined) return 0
  if (!(self.height > 0) || !(row.height > 0)) return 0
  return row.top + row.height / 2 - (self.top + self.height / 2)
}

/**
 * Centre the control on the account row below it, in place.
 *
 * The offset is written straight to the element's style rather than returned for
 * a render: it is a measurement of the layout, and routing it through React
 * would make every pass depend on the transform it just applied.
 * @param control - the control's button.
 * @param displayOf - computed `display` reader (injectable for tests).
 * @returns the applied offset in CSS pixels, or null when there is no row.
 */
export function alignToAccountRow(control, displayOf) {
  const row = accountRowOf(control, displayOf)
  if (row === null) return null
  // Measure from the untransformed box: the offset IS a transform, so leaving
  // the previous one in place would stack a delta on every pass.
  control.style.transform = 'none'
  const measured = centerOffset(control.getBoundingClientRect(), row.getBoundingClientRect())
  // Two decimals keeps the style string readable without giving up subpixel
  // centring (fractional layout heights produce values like 60.299999999999955).
  const offset = Math.round(measured * 100) / 100
  control.style.transform = `translateY(${offset}px)`
  return offset
}

/**
 * Stylesheet the client installs for the sidebar control.
 *
 * Kept here, next to the measurement it complements, so the browser test can
 * feed the same text into a fixture instead of copying the rules.
 */
export const SIDEBAR_STYLES = [
  // Expanded: the footer slot owns a row above the account row, so push to that
  // row's trailing edge. The measured transform moves it down onto the account
  // row; `z-index` keeps the later-painted row from covering the control.
  '.dsws-icon-btn{margin-left:auto;margin-right:4px;z-index:1}',
  // Rail: the footer row centres its children and the account row is a later
  // sibling, so dropping the offsets puts the control above the avatar. The
  // measured offset is an inline style, which only `!important` can outrank —
  // the shell's attribute stays authoritative whatever the measurement did.
  '[data-sidebar-collapsed="true"] .dsws-icon-btn{margin-left:0;margin-right:0;z-index:auto;transform:none!important}',
].join('\n')
