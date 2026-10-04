import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/order/track-order-form";
import { getCachedStoreName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getCachedStoreName();
  return {
    title: "Track your order",
    description: `Check the status of your ${storeName} order with your order number.`,
  };
}

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;
  return <TrackOrderForm initialOrderNumber={orderNumber} />;
}
