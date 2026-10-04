"use client";

import { useCallback, useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import {
  CONSENT_SETTINGS_EVENT,
  gatesTracking,
  loadConsent,
  saveConsent,
  showsBanner,
  type ConsentMode,
  type ConsentState,
} from "@/lib/analytics/consent";
import { Button } from "@/components/ui/button";

const COPY: Record<
  ConsentMode,
  { body: string; accept: string; reject: string }
> = {
  required: {
    body: "We use cookies and analytics to improve your experience. Essential features (cart, checkout, favourites) work without them. You can choose whether to allow analytics and marketing tracking.",
    accept: "Accept all",
    reject: "Necessary only",
  },
  informational: {
    body: "We use cookies, analytics and marketing tools such as the Meta Pixel to understand how the store is used and to measure advertising. Your choice here does not change what runs on this site.",
    accept: "Got it",
    reject: "",
  },
  disabled: { body: "", accept: "", reject: "" },
};

export function ConsentBanner({ mode }: { mode: ConsentMode }) {
  // Consent lives in localStorage (browser-only). The banner must never be
  // rendered during SSR, otherwise the server always emits it while the client
  // (which can read the saved choice) renders without it — causing hydration
  // to discard the DOM and the buttons to stop responding.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ConsentState>(null);

  const isVisible = showsBanner(mode);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const sync = () => {
      const state = loadConsent();
      setCurrent(state);
      setVisible(state === null);
    };
    sync();
    // The footer "Cookie settings" link re-opens the banner by asking for the
    // stored choice to be dropped, which is what lets a visitor change an
    // answer they have already made.
    window.addEventListener(CONSENT_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(CONSENT_SETTINGS_EVENT, sync);
  }, [isVisible]);

  const decide = useCallback((state: { analytics: boolean; marketing: boolean }) => {
    saveConsent(state);
    setCurrent(state);
    setVisible(false);
  }, []);

  if (!mounted || !isVisible || !visible) return null;

  const copy = COPY[mode];
  const gates = gatesTracking(mode);
  const alreadyAnswered = current !== null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="border-border bg-popover shadow-popover mx-auto flex max-w-2xl flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          <span className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
            <Cookie className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm">{copy.body}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!gates && (
            <Button onClick={() => decide({ analytics: true, marketing: true })}>
              {copy.accept}
            </Button>
          )}
          {gates && (
            <>
              <Button variant="secondary" onClick={() => decide({ analytics: false, marketing: false })}>
                {copy.reject}
              </Button>
              <Button onClick={() => decide({ analytics: true, marketing: true })}>
                {copy.accept}
              </Button>
            </>
          )}
        </div>
        {alreadyAnswered && (
          <p className="sr-only" role="status">
            Your previous cookie choice can be changed at any time.
          </p>
        )}
      </div>
    </div>
  );
}