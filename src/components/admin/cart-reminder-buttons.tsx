"use client";

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import {
  sendAbandonedCartReminderAction,
  sendAllAbandonedCartRemindersAction,
} from "@/actions/admin/abandoned-carts";
import { Button } from "@/components/ui/button";

export function CartReminderButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await sendAbandonedCartReminderAction(id);
        if (!result.ok) {
          alert(result.error ?? "Failed to send reminder.");
          setPending(false);
        }
      }}
    >
      {pending ? (
        <LoaderCircle className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="mr-1.5 size-3.5" aria-hidden="true" />
      )}
      Send reminder
    </Button>
  );
}

export function SendAllRemindersButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await sendAllAbandonedCartRemindersAction();
        setPending(false);
        if (result.ok) {
          alert(
            result.sent === 0
              ? "No carts were due for a reminder."
              : `Reminders sent to ${result.sent} customer${result.sent === 1 ? "" : "s"}.`
          );
        } else {
          alert(result.error ?? "Failed to send reminders.");
        }
      }}
    >
      {pending && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
      Send all reminders
    </Button>
  );
}