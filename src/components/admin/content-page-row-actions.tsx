"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Sparkles, Trash2 } from "lucide-react";
import {
  createDefaultPagesAction,
  deleteContentPageAction,
} from "@/actions/admin/content-pages";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DefaultPagesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await createDefaultPagesAction();
          setPending(false);
          if (result.error) {
            setNote(result.error);
          } else {
            setNote(null);
            router.refresh();
          }
        }}
      >
        <Sparkles className="mr-2 size-4" aria-hidden="true" />
        {pending ? "Creating…" : "Create default pages"}
      </Button>
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}
    </div>
  );
}

export function ContentPageRowActions({
  id,
  href,
  viewHref,
}: {
  id: string;
  href: string;
  viewHref: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={viewHref}
        target="_blank"
        rel="noreferrer"
        className="border-border text-muted-foreground hover:text-foreground rounded-md border p-1.5"
        aria-label="View page"
      >
        <Eye className="size-3.5" aria-hidden="true" />
      </Link>
      <Link
        href={href}
        className="border-border text-muted-foreground hover:text-foreground rounded-md border p-1.5"
        aria-label="Edit page"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete page"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await deleteContentPageAction(id);
          if (!result.ok) {
            toast.error("Could not delete page.");
            setPending(false);
          }
          router.refresh();
        }}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
