"use client";

import { useEffect, useRef } from "react";
import { trackAnalytics } from "@/components/analytics/analytics";
import type { TrackName, TrackPayload } from "@/lib/analytics";

export type AnalyticsItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

function EventOnMount({ name, payload }: { name: TrackName; payload: TrackPayload }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackAnalytics(name, payload);
  }, [name, payload]);

  return null;
}

export function ViewItemTracker({ item }: { item: AnalyticsItem }) {
  return <EventOnMount name="view_item" payload={{ currency: "BDT", items: [item] }} />;
}

export function BeginCheckoutTracker({
  value,
  coupon,
  items,
}: {
  value: number;
  coupon?: string | null;
  items: AnalyticsItem[];
}) {
  return (
    <EventOnMount
      name="begin_checkout"
      payload={{ currency: "BDT", value, coupon: coupon ?? undefined, items }}
    />
  );
}

export function PurchaseTracker({
  transactionId,
  eventId,
  value,
  deliveryFee,
  coupon,
}: {
  transactionId: string;
  /** Shared with the CAPI event so Meta deduplicates the pair into one
   * conversion. Must be deterministic per order, never a fresh random value. */
  eventId?: string;
  value: number;
  deliveryFee?: number;
  coupon?: string | null;
}) {
  return (
    <EventOnMount
      name="purchase"
      payload={{
        currency: "BDT",
        value,
        transaction_id: transactionId,
        ...(eventId ? { eventID: eventId } : {}),
        ...(deliveryFee !== undefined ? { shipping: deliveryFee } : {}),
        ...(coupon ? { coupon } : {}),
      }}
    />
  );
}

export function SearchTracker({ query }: { query: string }) {
  return <EventOnMount name="search" payload={{ search_term: query }} />;
}
