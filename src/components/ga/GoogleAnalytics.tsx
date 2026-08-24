"use client";

import Script from "next/script";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";
import { GA_MEASUREMENT_ID, flushGaQueue } from "@/lib/ga";

/**
 * Loads GA4 only after the visitor accepts analytics cookies.
 * Renders nothing when consent is pending or rejected.
 */
export function GoogleAnalytics() {
  const { status } = useAnalyticsConsent();

  if (status !== "accepted" || !GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        onReady={flushGaQueue}
      >
        {`
          window['ga-disable-${GA_MEASUREMENT_ID}'] = false;
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
