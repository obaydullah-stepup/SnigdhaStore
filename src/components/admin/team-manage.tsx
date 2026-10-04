"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createTeamMemberAction,
  removeTeamMemberAction,
  setTeamMemberRoleAction,
} from "@/actions/admin/team";
import { Button } from "@/components/ui/button";

export function TeamMemberActions({
  id,
  role,
  isSelf,
}: {
  id: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeRole(next: string) {
    startTransition(async () => {
      const result = await setTeamMemberRoleAction(
        id,
        next as "STAFF" | "ADMIN"
      );
      if (!result.ok) toast.error(result.error ?? "Failed to update role.");
      else toast.success("Role updated.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Remove this member from the team?")) return;
    startTransition(async () => {
      const result = await removeTeamMemberAction(id);
      if (!result.ok) toast.error(result.error ?? "Failed to remove member.");
      else toast.success("Team member removed.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Role"
        value={role}
        disabled={isPending || isSelf}
        onChange={(e) => changeRole(e.target.value)}
        className="border-border bg-card rounded-md border px-2 py-1.5 text-xs"
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending || isSelf}
        onClick={remove}
        aria-label="Remove team member"
      >
        <ShieldOff className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function InviteTeamForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="border-border bg-card rounded-xl border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        startTransition(async () => {
          const result = await createTeamMemberAction(data);
          setMessage(result.error ?? "Team member added.");
          if (result.ok) form.reset();
        });
      }}
    >
      <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
        Invite a team member
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Full name"
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email address"
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="phone"
          placeholder="Phone (optional)"
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Temporary password (min 8 chars)"
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue="STAFF"
          className="border-border bg-background rounded-md border px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="STAFF">Staff (orders, products, inventory, reviews)</option>
          <option value="ADMIN">Admin (full access)</option>
        </select>
      </div>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <Button type="submit" disabled={isPending} className="mt-4">
        {isPending ? (
          "Adding…"
        ) : (
          <>
            <ShieldPlus className="size-4" aria-hidden="true" />
            Add team member
          </>
        )}
      </Button>
    </form>
  );
}