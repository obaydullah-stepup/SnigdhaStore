"use client";

import { useEffect, useState } from "react";
import {
  GA_MEASUREMENT_ID,
  GTM_ID,
  META_PIXEL_ID_PATTERN,
  type TrackName,
  type TrackPayload,
} from "@/lib/analytics";
import {
  CONSENT_EVENT,
  gatesTracking,
  loadConsent,
  resolveTrackingGating,
  type ConsentMode,
  type ConsentState,
} from "@/lib/analytics/consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const FACEBOOK_TRACKING_EVENT: Record<TrackName, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
  apply_coupon: "ApplyCoupon",
};

function injectScript(src: string): void {
  if (document.querySelector(`script[data-snigdha-analytics-src*="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("data-snigdha-analytics-src", src);
  script.src = src;
  document.head.appendChild(script);
}

function initAnalytics(
  consent: ConsentState,
  metaPixelId: string,
  consentMode: ConsentMode
): void {
  const { allowAnalytics, allowMarketing } = resolveTrackingGating(consentMode, consent);

  if (allowAnalytics && GTM_ID) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    injectScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
  }

  if (allowAnalytics && GA_MEASUREMENT_ID) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    const inline = document.createElement("script");
    inline.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(inline);
  }

  // The ID reaches an inline script, so it is validated server-side and
  // re-asserted here before use. `JSON.stringify` escapes it for a JS string
  // literal, which matters now that the value comes from the database rather
  // than a build-time env var.
  if (allowMarketing && META_PIXEL_ID_PATTERN.test(metaPixelId)) {
    const inline = document.createElement("script");
    inline.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', ${JSON.stringify(metaPixelId)});
      fbq('track', 'PageView');
    `;
    document.head.appendChild(inline);
  }
}

export function trackAnalytics(name: TrackName, payload: TrackPayload = {}): void {
  try {
    if (typeof window === "undefined") return;
    window.gtag?.("event", name, payload);
    const facebookEvent = FACEBOOK_TRACKING_EVENT[name];
    if (facebookEvent && typeof window.fbq === "function") {
      // Meta takes the dedupe event ID as a fourth argument, not inside the
      // event data, so it is split out here.
      const { eventID: eventId, ...eventData } = payload as TrackPayload & {
        eventID?: string;
      };
      if (name === "apply_coupon") {
        window.fbq("trackCustom", facebookEvent, eventData);
      } else if (eventId) {
        window.fbq("track", facebookEvent, eventData, { eventID: eventId });
      } else {
        window.fbq("track", facebookEvent, eventData);
      }
    }
  } catch {
    // Analytics must never break the storefront.
  }
}

/**
 * Resolved on the server from Admin > Settings (or the env fallback) and passed
 * in, because a client component cannot read the database itself.
 */
export function Analytics({
  metaPixelId,
  consentMode,
}: {
  metaPixelId: string;
  consentMode: ConsentMode;
}) {
  const [consent, setConsent] = useState<ConsentState>(() => loadConsent());

  useEffect(() => {
    // In gating modes an unanswered visitor gets nothing. In the other modes
    // the banner is decorative, so init regardless of whether they answered.
    if (gatesTracking(consentMode) && !consent) return;
    initAnalytics(consent ?? { analytics: false, marketing: false }, metaPixelId, consentMode);
  }, [consent, metaPixelId, consentMode]);

  useEffect(() => {
    const handle = () => setConsent(loadConsent());
    window.addEventListener(CONSENT_EVENT, handle);
    return () => window.removeEventListener(CONSENT_EVENT, handle);
  }, []);

  return null;
}
