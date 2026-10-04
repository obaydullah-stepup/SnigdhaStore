"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletterAction } from "@/actions/newsletter";
import { useIntl } from "@/components/i18n/locale-provider";

const initialState = null;

function Message({
  result,
}: {
  result: null | Awaited<ReturnType<typeof subscribeNewsletterAction>>;
}) {
  if (!result) return null;
  return (
    <p
      className={
        result.status === "success" ? "text-success text-sm" : "text-destructive text-sm"
      }
    >
      {result.status === "success" ? result.message.en : result.message.en}
    </p>
  );
}

export function NewsletterForm() {
  const { t } = useIntl();
  const [result, action, pending] = useActionState(
    subscribeNewsletterAction,
    initialState
  );

  return (
    <div>
      <form action={action} className="flex w-full max-w-sm gap-2">
        <div className="relative flex-1">
          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            aria-label={t("newsletter.emailAria")}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t("newsletter.subscribing") : t("newsletter.subscribe")}
        </Button>
      </form>
      <Message result={result} />
    </div>
  );
}
