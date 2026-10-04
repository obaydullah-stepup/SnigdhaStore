import { PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIMELINE_STEPS,
  ORDER_STATUS,
  statusLabel,
  timelineStep,
} from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";

export function OrderTimeline({
  status,
  events,
}: {
  status: OrderStatus;
  events: { status: OrderStatus; note: string | null; createdAt: Date }[];
}) {
  const isTerminal = status === "CANCELLED" || status === "RETURNED";

  if (isTerminal) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
        <p className="text-destructive flex items-center gap-2 text-sm font-semibold">
          <PackageX className="size-4" aria-hidden="true" />
          {statusLabel(status)}
        </p>
        {events.map((e, i) => (
          <p key={i} className="text-muted-foreground mt-1 text-xs">
            {e.note} ·{" "}
            {e.createdAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        ))}
      </div>
    );
  }

  const step = timelineStep(status);

  return (
    <div>
      <ol className="flex items-center">
        {TIMELINE_STEPS.map((s, i) => {
          const filled = i <= step;
          const isLast = i === TIMELINE_STEPS.length - 1;
          return (
            <li key={s.status} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex h-6 items-center">
                  <span
                    className={cn(
                      "size-3.5 rounded-full border-2",
                      filled ? "border-primary bg-primary" : "border-border bg-background"
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={cn(
                    "text-[11px] whitespace-nowrap",
                    filled ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <span
                  className={cn(
                    "mx-1 h-0.5 flex-1 -translate-y-3 rounded-full",
                    i < step ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-col gap-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                ORDER_STATUS[e.status]?.tone ?? "bg-muted"
              )}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{statusLabel(e.status)}</span>
              {e.note ? ` — ${e.note}` : ""}
              <span className="ml-1.5">
                {e.createdAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
