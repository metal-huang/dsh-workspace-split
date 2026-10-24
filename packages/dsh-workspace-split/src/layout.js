/**
 * Placement math for the sidebar control.
 *
 * The `sidebar.footer.action` slot renders its entries in a row of its own,
 * above the account row. How far down the account row sits is owned by the
 * shell — its font scale, its padding, and whatever else the footer holds — so
 * a constant offset only lines up by accident: at 40px the split control
 * floated between the footer icons and the account row. The client measures the
 * two boxes and translates by this offset instead.
 *
 * Kept free of React and DOM so the arithmetic can be tested directly.
 */

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
