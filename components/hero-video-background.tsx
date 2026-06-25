'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type HeroVideoBackgroundProps = {
    /** Path to the looping background video (served from /public). */
    src?: string
    /** First-frame poster shown instantly (becomes the LCP element) and while playback is deferred/skipped. */
    poster?: string
    className?: string
}

/**
 * Full-bleed, muted, looping background video for the landing hero.
 *
 * Performance strategy (keeps FCP / LCP / TBT / Speed Index low):
 * - A lightweight poster (the video's first frame) paints immediately so it — not
 *   the heavy clip — is the LCP element. No white/dark flash before paint.
 * - The clip uses `preload="none"` and only starts downloading once the browser is
 *   idle, so the ~1.2 MB video never competes with critical CSS/JS or the poster.
 * - Because the poster IS the first frame, the swap to live playback is seamless.
 * - Respects `prefers-reduced-motion` and the Save-Data hint: in those cases the
 *   clip is never downloaded and the still poster is shown instead.
 */
export function HeroVideoBackground({
    src = '/assets/landing/bg.webm',
    poster = '/assets/landing/bg_poster.jpg',
    className,
}: HeroVideoBackgroundProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        // React only sets the `muted` attribute, not the property — Chrome needs
        // the property to be true to allow muted autoplay.
        video.muted = true

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches
        const connection = (
            navigator as Navigator & { connection?: { saveData?: boolean } }
        ).connection
        const saveData = connection?.saveData === true

        // Honour reduced-motion / data-saver: keep the still poster, never fetch the clip.
        if (prefersReducedMotion || saveData) return

        // Defer the download + playback until the browser is idle so the clip never
        // competes with the LCP poster paint or critical CSS/JS (lower LCP / TBT / SI).
        let cancelled = false
        const startPlayback = () => {
            if (cancelled) return
            video.preload = 'auto'
            // play() also kicks off the network load for a preload="none" element.
            // Some browsers reject programmatic autoplay; swallow it so the poster
            // remains as a graceful fallback.
            video.play().catch(() => {})
        }

        const idle = window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
            cancelIdleCallback?: (id: number) => void
        }

        let idleId: number | undefined
        let timeoutId: number | undefined
        if (typeof idle.requestIdleCallback === 'function') {
            idleId = idle.requestIdleCallback(startPlayback, { timeout: 2000 })
        } else {
            // Fallback for browsers without requestIdleCallback (e.g. Safari).
            timeoutId = window.setTimeout(startPlayback, 600)
        }

        return () => {
            cancelled = true
            if (idleId !== undefined && typeof idle.cancelIdleCallback === 'function') {
                idle.cancelIdleCallback(idleId)
            }
            if (timeoutId !== undefined) window.clearTimeout(timeoutId)
        }
    }, [])

    return (
        <div
            aria-hidden="true"
            className={cn(
                'absolute inset-0 -z-20 overflow-hidden bg-neutral-250',
                className
            )}>
            <video
                ref={videoRef}
                aria-hidden="true"
                tabIndex={-1}
                muted
                loop
                playsInline
                preload="none"
                poster={poster}
                className="absolute inset-0 h-full w-full object-cover">
                <source src={src} type="video/webm" />
            </video>
        </div>
    )
}

// import Image from 'next/image'

// export function HeroVideoBackground({
//     src = '/image3.png',
//     className,
// }: {
//     src?: string
//     className?: string
// }) {
//     return (
//         <div
//             aria-hidden="true"
//             className={cn(
//                 'absolute inset-0 -z-20 overflow-hidden bg-neutral-950',
//                 className
//             )}
//         >
//             <Image
//                 src={src}
//                 alt=""
//                 fill
//                 priority
//                 aria-hidden="true"
//                 className="object-cover"
//             />
//         </div>
//     )
// }
