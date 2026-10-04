export type ConsentState = { analytics: boolean; marketing: boolean } | null;

/**
 * How the banner behaves. Kept as a local copy of `ConsentMode` from
 * @/lib/settings so this module stays importable from client components
 * (settings.ts is server-only).
 */
export type ConsentMode = "required" | "informational" | "disabled";

const CONSENT_KEY = "snigdha_consent";

export const CONSENT_EVENT = "snigdha-consent";

/**
 * Dispatched by the footer "Cookie settings" link so the banner can re-open
 * even after a visitor has already answered, which is what makes withdrawal
 * possible without a rebuild.
 */
export const CONSENT_SETTINGS_EVENT = "snigdha-consent-settings";

export function loadConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { analytics?: unknown; marketing?: unknown };
    if (!parsed || typeof parsed.analytics !== "boolean") return null;
    return { analytics: parsed.analytics, marketing: parsed.marketing === true };
  } catch {
    return null;
  }
}

export function saveConsent(state: { analytics: boolean; marketing: boolean }): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
  } catch {
    // Storage may be unavailable (private mode) — analytics stay off.
  }
}

/**
 * Forgets the saved choice so the banner treats the visitor as unanswered
 * again. Used by the footer settings link; the stored value is only replaced
 * once the visitor actually decides.
 */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent(CONSENT_SETTINGS_EVENT));
  } catch {
    // Ignore: a banner that cannot be reopened is better than a crash.
  }
}



/**
 * Whether tracking may load, given the configured consent mode.
 *
 * `required` is the only mode that gates: nothing loads until the visitor
 * answers, and marketing waits for the marketing flag. `informational` shows
 * the banner but never blocks, and `disabled` has no banner and no gate, so
 * tracking behaves as though consent had already been given.
 *
 * In `required` mode an unanswered visitor gets nothing, which is the point.
 */
export function resolveTrackingGating(
  mode: ConsentMode,
  consent: ConsentState
): { allowAnalytics: boolean; allowMarketing: boolean } {
  if (mode === "disabled") return { allowAnalytics: true, allowMarketing: true };
  if (mode === "informational") return { allowAnalytics: true, allowMarketing: true };
  return {
    allowAnalytics: consent?.analytics === true,
    allowMarketing: consent?.marketing === true,
  };
}

/** Whether the banner should be rendered at all in this mode. */
export function showsBanner(mode: ConsentMode): boolean {
  return mode !== "disabled";
}

/** Whether the answer actually controls tracking, rather than just informing. */
export function gatesTracking(mode: ConsentMode): boolean {
  return mode === "required";
}