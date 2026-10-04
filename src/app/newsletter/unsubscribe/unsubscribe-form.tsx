"use client";

import { useActionState } from "react";
import { MailX } from "lucide-react";
import { unsubscribeNewsletterAction } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-message";

type Result = Awaited<ReturnType<typeof unsubscribeNewsletterAction>> | null;
const initialState: Result = null;

export function UnsubscribeForm({ email }: { email?: string }) {
  const [state, dispatch, pending] = useActionState(unsubscribeNewsletterAction, initialState);
  const done = state?.status === "success";

  if (done) {
    return <FormAlert message={state.message} tone="success" />;
  }

  return (
    <form action={dispatch} className="space-y-4" noValidate>
      {state?.status === "error" ? <FormAlert message={state.message} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <MailX
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            placeholder="you@example.com"
            className="pl-9"
            required
          />
        </div>
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </form>
  );
}