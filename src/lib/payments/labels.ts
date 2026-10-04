import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Display labels for the PaymentMethod enum.
 *
 * The database stores SCREAMING_SNAKE_CASE (`CASH_ON_DELIVERY`,
 * `SSL_COMMERZ`), which reads as raw data wherever it is rendered. Every
 * user-facing surface goes through `paymentMethodLabel()` instead of printing
 * the enum directly.
 *
 * This lives in its own module, separate from `provider.ts`, because
 * `provider.ts` imports the generated Prisma client as a *value*
 * (`PaymentMethod.CASH_ON_DELIVERY`). That client is a `node:module`, so
 * importing provider.ts from a client component breaks the Turbopack build.
 * The import below is type-only, so it is erased at compile time and this
 * module stays safe to import from both server and client components.
 *
 * Keys are exhaustive over the enum, so adding a value to Prisma without a
 * label here is a type error rather than a silent raw-enum leak in the UI.
 */
const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "CASH ON DELIVERY",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  SSL_COMMERZ: "SSL COMMERZ",
  STRIPE: "STRIPE",
};

const PAYMENT_METHOD_LABEL_BN: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "ক্যাশ অন ডেলিভারি",
  BKASH: "বিকাশ",
  NAGAD: "নগদ",
  SSL_COMMERZ: "এসএসএল কমার্স",
  STRIPE: "স্ট্রাইপ",
};

/**
 * @param method Raw enum value from the database.
 * @param locale "bn" for the Bengali label, anything else for English.
 */
export function paymentMethodLabel(
  method: PaymentMethod | string | null | undefined,
  locale: "en" | "bn" = "en"
): string {
  if (!method) return "—";
  // Reports bucket legacy rows under a sentinel rather than dropping them.
  if (method === "UNKNOWN") return "Unknown";
  const table = locale === "bn" ? PAYMENT_METHOD_LABEL_BN : PAYMENT_METHOD_LABEL;
  return table[method as PaymentMethod] ?? method;
}