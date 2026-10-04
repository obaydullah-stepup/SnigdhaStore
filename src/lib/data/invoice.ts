import "server-only";
import { prisma } from "@/lib/prisma";
import type { InvoiceOrder } from "@/components/invoice/invoice-document";

/**
 * Loads an order for invoice rendering. Selects only the fields the sheet
 * needs — notably never `internalNote`, which staff may fill in but customers
 * must not see.
 *
 * Pass `scope.userId` to confine the lookup to one customer. Then another
 * customer's order simply comes back as `null`, which the route turns into the
 * same `notFound()` as a missing order so this path cannot be used to probe
 * which order IDs exist.
 */
export async function getInvoiceOrder(
  orderId: string,
  scope?: { userId: string }
): Promise<InvoiceOrder | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId, ...(scope ? { userId: scope.userId } : {}) },
    select: {
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      total: true,
      couponCode: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      createdAt: true,
      shippingAddress: true,
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          price: true,
          total: true,
          product: { select: { name: true } },
          variant: { select: { name: true } },
        },
      },
    },
  });

  if (!order) return null;
  return { ...order, items: order.items };
}
