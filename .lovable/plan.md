# Checkout cleanup and direct printing

## Changes
1. **Show complete item names.** Replace the checkout row’s `truncate` styling with natural wrapping and `overflow-wrap: anywhere`. Put the name on the first line and a compact, aligned controls row below it so long names never compete with buttons for space.
2. **Remove extra item detail text.** Remove the checkout’s unit-price/“each” line. Remove the “Base ·” prefix from the billing menu’s standard-price button, retaining its price and variant choices. Checkout items will show only their name, quantity controls, line total, and delete icon.
3. **Make quantity editable.** Replace the quantity span with a labelled input between minus and plus. Accept positive whole numbers and update line totals, quantity totals, discounts, taxes, and grand total immediately. Allow temporary empty input while editing; restore the last valid quantity on blur. Reject negatives, decimals, zero, and unsafe values; preserve the existing minus-to-remove behavior and delete button.
4. **Use the exact label “Print Bill”.** Keep the printer icon and disable the action when the cart is empty or a print operation is already underway.
5. **Print directly.** Remove the Billing receipt-review dialog and its extra confirmation actions. Clicking Print Bill creates and saves one bill, mounts its receipt in a print-only area, then calls `window.print()` once the receipt is rendered. Keep the receipt mounted throughout printing and clean up afterwards. Prevent repeated clicks from creating duplicates, consume bill/token counters once, and retain the saved bill if printing fails or is cancelled. Orders reprinting stays unchanged.

## Technical details
- Update `src/routes/pos.tsx` markup and cart/print handlers using the existing React, Button, Input, Receipt, local storage, and integer-paise helpers.
- Use a constrained grid for the controls: fixed-size minus/input/plus and delete controls, with a flexible right-aligned total. Use `min-w-0`, wrapping, and stable widths to keep content inside the checkout card.
- Add scoped print-only visibility rules in `src/styles.css`, preserving the existing 80mm page and 72mm printable receipt width. Ensure the hidden receipt becomes visible in print without bringing application controls into the output.
- Native browser printing cannot confirm physical success or distinguish cancellation reliably; do not claim otherwise. A thrown print error marks the saved bill as `print_failed` and allows reprinting from Orders.
- Record the print-only rendering decision in `AGENTS.md` and track the work in `roadmap.md` during implementation.

## Verification
- Exercise long names and long unbroken words at the current checkout width and a narrow screen; confirm every control and price stays inside the card.
- Type quantities, clear and replace them, try negative/decimal/zero values, and use plus/minus/delete; confirm valid changes recalculate totals immediately.
- Click Print Bill and verify no review dialog appears, the saved order reads back in Orders, and independent counters increment only once.
- Verify one print invocation per sale, print-only receipt visibility, saved-order retention after cancellation/failure, and the existing thermal print layout using browser print emulation/PDF output.
- Check the current build diagnostics before reporting completion. Physical printer alignment still requires a test on the customer’s TENAX printer.

All five changes will be implemented together; no login, backend, or storage migration is included.