"use client";

import { useActionState } from "react";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { verifyEmailAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/form-message";
import type { AuthActionResult } from "@/validators/auth";

const initialState: AuthActionResult = { ok: false };

export function VerifyEmailForm({
  token,
  storeName,
}: {
  token: string;
  storeName: string;
}) {
  const [state, dispatch, pending] = useActionState(verifyEmailAction, initialState);

  if (state.ok) {
    return (
      <FormAlert
        tone="success"
        message={{
          en: `Your email is verified. Welcome to ${storeName}!`,
          bn: `আপনার ইমেইল ভেরিফাই হয়েছে। ${storeName}-এ স্বাগতম!`,
        }}
      />
    );
  }

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.ok === false && state.error ? <FormAlert message={state.error} /> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
        ) : (
          <BadgeCheck className="mr-2 size-4" aria-hidden="true" />
        )}
        {pending ? "Verifying…" : "Verify my email"}
      </Button>
    </form>
  );
}
