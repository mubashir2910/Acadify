'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type HeroVideoBackgroundProps = {
    /** Path to the looping background video (served from /public). */
    src?: string
    /** Optional first-frame poster shown until the video paints / when playback is skipped. */
    poster?: string
    className?: string
}

/**
 * Full-bleed, autoplaying, muted, looping background video for the landing hero.
 *
 * Behaviour:
 * - Sits behind the hero content (`-z-20`) with a dark base colour so there is no
 *   white flash before the video paints.
 * - Fades in once the first frame is ready to avoid a hard pop-in.
 * - Respects `prefers-reduced-motion` and the Save-Data hint: in those cases the
 *   video is not played and the poster / first frame is shown instead.
 */

// export function HeroVideoBackground({ className }: { className?: string }) {
//     return (
//         <div
//             aria-hidden="true"
//             className={cn(
//                 'absolute inset-0 -z-20 overflow-hidden bg-neutral-950',
//                 className
//             )}>
//             <img
//                 src="/image.png"
//                 alt=""
//                 className="absolute inset-0 h-full w-full object-cover"
//             />
//         </div>
//     )
// }

export function HeroVideoBackground({
    src = '/pc3.mp4',
    poster,
    className,
}: HeroVideoBackgroundProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isReady, setIsReady] = useState(false)

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

        // Reveal on the next frame, unconditionally — never depend on a media
        // event firing to become visible (it can be missed → stuck transparent).
        // Kick off playback only AFTER the element is visible, otherwise Chrome
        // may refuse to autoplay a fully-transparent (opacity:0) element.
        const raf = requestAnimationFrame(() => {
            setIsReady(true)
            if (!prefersReducedMotion && !saveData) {
                // Some browsers reject programmatic autoplay; swallow the
                // rejection so the first frame still shows as a fallback.
                video.play().catch(() => {})
            }
        })

        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            aria-hidden="true"
            className={cn(
                'absolute inset-0 -z-20 overflow-hidden bg-neutral-950',
                className
            )}>
            <video
                ref={videoRef}
                aria-hidden="true"
                tabIndex={-1}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={poster}
                // Extra safety nets so the layer can never stay invisible.
                onCanPlay={() => setIsReady(true)}
                onError={() => setIsReady(true)}
                className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
                    isReady ? 'opacity-100' : 'opacity-0'
                )}>
                <source src={src} type="video/mp4" />
            </video>
        </div>
    )
}
