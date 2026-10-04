/**
 * Shared between the server (CAPI) and the storefront (browser pixel) so both
 * sides derive the same event ID for an order. Kept free of server-only
 * imports so the client component can use it.
 */
export function purchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`;
}