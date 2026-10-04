import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_EVENT,
  CONSENT_SETTINGS_EVENT,
  clearConsent,
  gatesTracking,
  loadConsent,
  resolveTrackingGating,
  saveConsent,
  showsBanner,
} from "@/lib/analytics/consent";

describe("resolveTrackingGating", () => {
  it("gates marketing and analytics in required mode", () => {
    expect(resolveTrackingGating("required", null)).toEqual({
      allowAnalytics: false,
      allowMarketing: false,
    });
    expect(
      resolveTrackingGating("required", { analytics: false, marketing: false })
    ).toEqual({ allowAnalytics: false, allowMarketing: false });
    expect(
      resolveTrackingGating("required", { analytics: true, marketing: true })
    ).toEqual({ allowAnalytics: true, allowMarketing: true });
  });

  it("keeps the pixel blocked when only analytics is granted", () => {
    expect(
      resolveTrackingGating("required", { analytics: true, marketing: false })
    ).toEqual({ allowAnalytics: true, allowMarketing: false });
  });

  it("does not gate in informational mode, even unanswered", () => {
    expect(resolveTrackingGating("informational", null)).toEqual({
      allowAnalytics: true,
      allowMarketing: true,
    });
    expect(
      resolveTrackingGating("informational", { analytics: false, marketing: false })
    ).toEqual({ allowAnalytics: true, allowMarketing: true });
  });

  it("does not gate in disabled mode", () => {
    expect(resolveTrackingGating("disabled", null)).toEqual({
      allowAnalytics: true,
      allowMarketing: true,
    });
  });
});

describe("consent mode predicates", () => {
  it("shows the banner for required and informational only", () => {
    expect(showsBanner("required")).toBe(true);
    expect(showsBanner("informational")).toBe(true);
    expect(showsBanner("disabled")).toBe(false);
  });

  it("only gates in required mode", () => {
    expect(gatesTracking("required")).toBe(true);
    expect(gatesTracking("informational")).toBe(false);
    expect(gatesTracking("disabled")).toBe(false);
  });
});

/**
 * The suite runs in the node environment, so there is no real `window`. A
 * minimal stand-in is enough for the storage and event paths; the banner's
 * rendering itself is a browser concern handled by its mounted check.
 */
type Listener = () => void;

function installFakeWindow(): void {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<Listener>>();

  const fake = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event: { type: string }) => {
      listeners.get(event.type)?.forEach((fn) => fn());
      return true;
    },
    CustomEvent: class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  };

  (globalThis as unknown as { window: typeof fake }).window = fake as never;
}

describe("consent storage", () => {
  beforeEach(() => {
    installFakeWindow();
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadConsent()).toBeNull();
  });

  it("persists a choice and announces it", () => {
    const handler = vi.fn();
    window.addEventListener(CONSENT_EVENT, handler);
    saveConsent({ analytics: true, marketing: false });

    expect(loadConsent()).toEqual({ analytics: true, marketing: false });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(CONSENT_EVENT, handler);
  });

  it("treats a malformed value as unanswered", () => {
    window.localStorage.setItem("snigdha_consent", "not-json");
    expect(loadConsent()).toBeNull();

    window.localStorage.setItem("snigdha_consent", JSON.stringify({ analytics: "yes" }));
    expect(loadConsent()).toBeNull();
  });

  it("treats a missing marketing flag as declined marketing", () => {
    window.localStorage.setItem("snigdha_consent", JSON.stringify({ analytics: true }));
    expect(loadConsent()).toEqual({ analytics: true, marketing: false });
  });

  it("clears the choice so the banner can reopen", () => {
    saveConsent({ analytics: true, marketing: true });
    clearConsent();

    expect(loadConsent()).toBeNull();
  });
});

describe("reopening the banner", () => {
  beforeEach(() => {
    installFakeWindow();
    window.localStorage.clear();
  });

  it("clearing drops the answer and signals the banner to reopen", () => {
    saveConsent({ analytics: true, marketing: true });

    const handler = vi.fn();
    window.addEventListener(CONSENT_SETTINGS_EVENT, handler);
    clearConsent();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(loadConsent()).toBeNull();
    window.removeEventListener(CONSENT_SETTINGS_EVENT, handler);
  });
});