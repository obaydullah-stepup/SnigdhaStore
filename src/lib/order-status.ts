import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "UNPAID",
  "PAID",
  "FAILED",
  "REFUNDED",
];

/**
 * Payment labels are kept separate from ORDER_STATUS on purpose.
 *
 * The enum value used to be `PENDING`, which collided with OrderStatus.PENDING:
 * a single order could render two different "Pending" badges meaning unrelated
 * things. It is now `UNPAID`, and the distinct Bengali label keeps the two axes
 * readable in the admin tables.
 *
 * `tone` pairs each background with its own foreground for the same reason as
 * ORDER_STATUS above — a light background with white text is unreadable.
 */
export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; labelBn: string; tone: string }
> = {
  UNPAID: {
    label: "Unpaid",
    labelBn: "অপরিশোধিত",
    tone: "bg-muted text-secondary-foreground",
  },
  PAID: {
    label: "Paid",
    labelBn: "পরিশোধিত",
    tone: "bg-emerald-500 text-white",
  },
  FAILED: {
    label: "Failed",
    labelBn: "ব্যর্থ",
    tone: "bg-destructive text-destructive-foreground",
  },
  REFUNDED: {
    label: "Refunded",
    labelBn: "ফেরতকৃত",
    tone: "bg-primary text-primary-foreground",
  },
};

export function paymentStatusLabel(status: PaymentStatus | null): string {
  if (!status) return "—";
  return PAYMENT_STATUS[status]?.label ?? status;
}

export function paymentStatusLabelBn(status: PaymentStatus | null): string {
  if (!status) return "—";
  return PAYMENT_STATUS[status]?.labelBn ?? status;
}

export function paymentStatusTone(status: PaymentStatus | null): string {
  if (!status) return "bg-muted text-secondary-foreground";
  return PAYMENT_STATUS[status]?.tone ?? "bg-muted text-secondary-foreground";
}

export const ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["CONFIRMED", "SHIPPED", "CANCELLED"],
  SHIPPED: ["PROCESSING", "DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * `tone` carries its own foreground as well as its background. Both call sites
 * used to hardcode `text-white`, which silently failed on light backgrounds:
 * `--muted` is a warm cream (#f6f1e7) in light mode, so Pending rendered as
 * white-on-cream at roughly 1.1:1. Pairing the colours here means a new
 * background cannot reintroduce that.
 *
 * Pending deliberately uses the muted cream as a *solid* badge colour with
 * dark text, rather than a subtle tint, so every status reads as a filled
 * pill consistently.
 */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; labelBn: string; step: number; tone: string }
> = {
  PENDING: {
    label: "Pending",
    labelBn: "অপেক্ষমাণ",
    step: 0,
    tone: "bg-muted text-secondary-foreground",
  },
  CONFIRMED: {
    label: "Confirmed",
    labelBn: "নিশ্চিত",
    step: 1,
    tone: "bg-primary text-primary-foreground",
  },
  PROCESSING: {
    label: "Processing",
    labelBn: "প্রসেসিং",
    step: 2,
    tone: "bg-primary text-primary-foreground",
  },
  SHIPPED: {
    label: "Shipped",
    labelBn: "পাঠানো হয়েছে",
    step: 3,
    tone: "bg-primary text-primary-foreground",
  },
  DELIVERED: {
    label: "Delivered",
    labelBn: "ডেলিভারি হয়েছে",
    step: 4,
    tone: "bg-emerald-500 text-white",
  },
  CANCELLED: {
    label: "Cancelled",
    labelBn: "বাতিল",
    step: 0,
    tone: "bg-destructive text-destructive-foreground",
  },
  RETURNED: {
    label: "Returned",
    labelBn: "ফেরত",
    step: 0,
    tone: "bg-destructive text-destructive-foreground",
  },
};

export const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PROCESSING", label: "Packing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export function statusLabel(status: OrderStatus): string {
  return ORDER_STATUS[status]?.label ?? status;
}

export function timelineStep(status: OrderStatus): number {
  return ORDER_STATUS[status]?.step ?? 0;
}

export function statusTone(status: OrderStatus): string {
  return ORDER_STATUS[status]?.tone ?? "bg-muted text-secondary-foreground";
}
