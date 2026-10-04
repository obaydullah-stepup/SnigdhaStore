import { NextResponse } from "next/server";
import { captureIncompleteOrder } from "@/lib/incomplete-orders-capture";

/**
 * Exit-time capture endpoint, called with `navigator.sendBeacon` from the
 * checkout form.
 *
 * A server action would be a plain fetch, and the browser aborts those as soon
 * as the document is torn down — exactly the moment a lead is most likely to be
 * lost. `sendBeacon` is designed to outlive the page, so the customer's name
 * and phone reach us even if they close the tab the instant they finish typing.
 *
 * Idempotent by cartId, so re-sending the same payload is harmless.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    return NextResponse.json({ ok: await captureIncompleteOrder(payload) });
  } catch (error) {
    console.error("[incomplete-orders] beacon capture failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
