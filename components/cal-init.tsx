"use client"

import { getCalApi } from "@calcom/embed-react"
import { useEffect } from "react"

// Initializes the Cal.com embed script (without the floating button).
// Use this on pages that need data-cal-* buttons but don't show the floating widget.
export default function CalInit() {
    useEffect(() => {
        (async function () {
            const cal = await getCalApi({ namespace: "acadify-demo" })
            cal("ui", {
                theme: "light",
                cssVarsPerTheme: {
                    light: { "cal-brand": "#0b2a4c" },
                    dark: { "cal-brand": "#0b2a4c" },
                },
                hideEventTypeDetails: false,
                layout: "month_view",
            })
        })()
    }, [])
    return null
}
