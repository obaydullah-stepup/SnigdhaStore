import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { LocalizedMessage } from "@/validators/auth";

export function FormAlert({
  message,
  tone = "error",
}: {
  message: LocalizedMessage;
  tone?: "error" | "success";
}) {
  const ok = tone === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        <span className="font-medium">{message.en}</span>{" "}
        <span className="opacity-80">{message.bn}</span>
      </span>
    </div>
  );
}

export function FieldError({ message }: { message?: LocalizedMessage }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-xs">
      {message.en} {message.bn}
    </p>
  );
}
