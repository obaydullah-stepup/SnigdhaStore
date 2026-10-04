import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getInvoiceOrder } from "@/lib/data/invoice";
import { getLayoutSettings } from "@/lib/settings";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PrintButton } from "@/components/invoice/print-button";

export const metadata = { title: "Invoice" };

export default async function AdminOrderInvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireStaff();
  const { orderId } = await params;

  const [invoice, settings] = await Promise.all([
    getInvoiceOrder(orderId),
    getLayoutSettings(),
  ]);
  if (!invoice) notFound();

  return (
    <>
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 print:hidden">
        <Link
          href={`/admin/orders/${orderId}`}
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
