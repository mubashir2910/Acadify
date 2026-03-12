"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function BookDemo() {
  useEffect(() => {
    let cancelled = false;

    (async function () {
      const cal = await getCalApi({ namespace: "acadify-demo" });
      // If component unmounted before the async call resolved, don't inject anything
      if (cancelled) return;

      cal("floatingButton", {
        calLink: "mubashir2910/acadify-demo",
        config: { layout: "month_view", useSlotsViewOnSmallScreen: "true", theme: "light" },
        buttonText: "Book a Demo",
        buttonPosition: "bottom-right",
        buttonColor: "#0b2a4c",
        buttonTextColor: "#ffffff",
      });
      cal("ui", {
        theme: "light",
        cssVarsPerTheme: {
          light: { "cal-brand": "#0b2a4c" },
          dark: { "cal-brand": "#0b2a4c" },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();

    // Cleanup: runs when component unmounts (i.e. user navigates away from a marketing page).
    // Removes all Cal.com DOM elements injected directly into document.body outside the React tree.
    return () => {
      cancelled = true;
      document.querySelector("cal-floating-button")?.remove();
      document.querySelectorAll('iframe[src*="cal.com"]').forEach((el) => el.remove());
    };
  }, []); // Empty deps: initialize on mount, clean up on unmount

  return null;
}
