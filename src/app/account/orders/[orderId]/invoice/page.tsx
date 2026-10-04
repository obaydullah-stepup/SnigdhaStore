import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getInvoiceOrder } from "@/lib/data/invoice";
import { getLayoutSettings } from "@/lib/settings";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PrintButton } from "@/components/invoice/print-button";

export const metadata = { title: "Invoice" };

export default async function OrderInvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requireUser();
  const { orderId } = await params;

  const [invoice, settings] = await Promise.all([
    getInvoiceOrder(orderId, { userId: user.id }),
    getLayoutSettings(),
  ]);

  // Another customer's order is filtered out by the same query, so this also
  // covers "does not exist" — the route cannot be used to probe order IDs.
  if (!invoice) notFound();

  return (
    <>
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 print:hidden">
        <Link
          href={`/account/orders/${orderId}`}
          className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to order
        </Link>
        <PrintButton />
      </div>

      <InvoiceDocument order={invoice} brand={settings} />
    </>
  );
}
