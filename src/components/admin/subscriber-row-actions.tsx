"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteNewsletterSubscriberAction } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";

export function SubscriberRowActions({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete subscriber"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await deleteNewsletterSubscriberAction(id);
        if (!result.ok) {
          alert(result.error ?? "Failed to delete subscriber.");
          setPending(false);
        }
      }}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );
}