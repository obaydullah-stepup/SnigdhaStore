import { PaymentMethod } from "@/generated/prisma/client";

export type PaymentProviderId = "COD";

export type PaymentProvider = {
  id: PaymentProviderId;
  name: string;
  nameBn: string;
  description: string;
  method: PaymentMethod;
  collectOffline: boolean;
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: "COD",
    name: "Cash on Delivery",
    nameBn: "ক্যাশ অন ডেলিভারি",
    description: "Pay in cash when your order arrives. Completely free, no extra charge.",
    method: PaymentMethod.CASH_ON_DELIVERY,
    collectOffline: true,
  },
];

export function getPaymentProvider(id: string): PaymentProvider | null {
  return PAYMENT_PROVIDERS.find((p) => p.id === id) ?? null;
}