"use client";

import { useTransition } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { resendVerificationEmailAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function ResendVerifyButton() {
  const [isPending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const res = await resendVerificationEmailAction();
      if (res.ok) {
        toast.success("Verification email sent.");
      } else {
        toast.error(res.error?.en ?? "Please try again in a moment.");
      }
    });
  }

  return (
    <Button variant="link" size="sm" onClick={resend} disabled={isPending}>
      {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      <MailCheck className="size-3.5" aria-hidden="true" />
      Resend verification email
    </Button>
  );
}
