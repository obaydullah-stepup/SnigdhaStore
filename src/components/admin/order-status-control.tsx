"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  saveInternalNoteAction,
  updateOrderStatusAction,
  updatePaymentStatusAction,
} from "@/actions/admin/orders";
import {
  ORDER_STATUS,
  ORDER_STATUSES,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  canTransition,
} from "@/lib/order-status";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OrderStatusControl({
  orderId,
  status,
  paymentStatus,
  internalNote,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  internalNote: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(status);
  const [selectedPayment, setSelectedPayment] = useState<PaymentStatus>(paymentStatus);
  const [note, setNote] = useState(internalNote ?? "");
  const [statusNote, setStatusNote] = useState("");
  const [saved, setSaved] = useState(false);

  function changeStatus(next: OrderStatus) {
    if (next === status) return;
    if (!canTransition(selectedStatus, next)) {
      toast.error("This status change is not allowed.");
      return;
    }
    setSelectedStatus(next);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, next, statusNote);
      if (res.ok) {
        toast.success("Order status updated.");
        setStatusNote("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update status.");
      }
    });
  }

  function changePayment(next: PaymentStatus) {
    setSelectedPayment(next);
    startTransition(async () => {
      const res = await updatePaymentStatusAction(orderId, next);
      if (res.ok) {
        toast.success("Payment status updated.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update payment status.");
      }
    });
  }

  function saveNote() {
    startTransition(async () => {
      await saveInternalNoteAction(orderId, note);
      setSaved(true);
      toast.success("Note saved.");
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
      <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
        Manage order
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">Order status</Label>
          <select
            id="status"
            value={selectedStatus}
            onChange={(e) => changeStatus(e.target.value as OrderStatus)}
            disabled={isPending}
            className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option
                key={s}
                value={s}
                disabled={s === selectedStatus || !canTransition(selectedStatus, s)}
              >
                {ORDER_STATUS[s]?.label ?? s}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Note for this change (optional)"
            disabled={isPending}
            className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment">Payment status</Label>
          <select
            id="payment"
            value={selectedPayment}
            onChange={(e) => changePayment(e.target.value as PaymentStatus)}
            disabled={isPending}
            className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="internalNote">Internal note (not shown to customer)</Label>
        <Textarea
          id="internalNote"
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Call customer to confirm delivery slot"
        />
      </div>
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={saveNote}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {saved ? "Saved" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
