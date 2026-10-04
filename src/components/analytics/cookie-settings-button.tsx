"use client";

import { clearConsent } from "@/lib/analytics/consent";

/**
 * A button rather than a link, since re-opening the consent banner involves no
 * navigation. Lives in its own file because the footer is a Server Component
 * and cannot receive an event handler from a parent.
 */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={clearConsent} className="hover:underline">
      {label}
    </button>
  );
}