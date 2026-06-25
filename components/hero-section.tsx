import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { HeroVideoBackground } from './hero-video-background'
import { HeroHeader } from './header'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
} as const

export default function HeroSection() {
    return (
        <>
            {/* Preload the hero poster so it paints as the LCP element ASAP (low LCP / Speed Index) */}
            <link rel="preload" as="image" href="/hero-poster.jpg" fetchPriority="high" />

            <HeroHeader />
            <main className="overflow-hidden">
                <section className="relative isolate min-h-svh w-full overflow-hidden">
                    {/* Full-screen looping background video (sits at -z-20 with a dark base) */}
                    <HeroVideoBackground />

                    {/* Dimming overlay so white typography stays readable over the video */}
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/25 to-black/60"
                    />

                    {/* Bottom blend — melts the dark hero into the light page section below */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 -z-6 h-10 bg-gradient-to-b from-transparent to-[var(--color-background)]"
                    />

                    {/* Mobile-only readability scrim: darkens the upper third where the
                        heading now sits, so white text stays legible over the sky/clouds
                        and clear of the ACADIFY building logo that appears later in the clip */}
                    <div
                        aria-hidden
                        className="md:hidden pointer-events-none absolute inset-x-0 top-0 -z-10 h-[80%] bg-gradient-to-b from-black/40 via-black/30 to-transparent"
                    />

                    <div className="relative z-10 mx-auto flex min-h-svh max-w-7xl flex-col items-center justify-end px-6 pb-[43vh] md:justify-center md:pb-0 md:pt-20 md:-mt-16">
                        <div className="w-full text-center">
                            {/* <AnimatedGroup variants={transitionVariants}>
                                <Link
                                    href="/login"
                                    className="group mx-auto flex w-fit items-center gap-4 rounded-full border border-white/20 bg-white/10 p-1 pl-4 text-white shadow-lg shadow-black/20 backdrop-blur-md transition-colors duration-300 hover:bg-white/20">
                                    <span className="text-sm text-white/90">Access your Workspace</span>
                                    <span className="block h-4 w-0.5 border-l border-white/20 bg-white/30"></span>

                                    <div className="size-6 overflow-hidden rounded-full bg-white/15 duration-500 group-hover:bg-white/25">
                                        <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                            <span className="flex size-6">
                                                <ArrowRight className="m-auto size-3 text-white" />
                                            </span>
                                            <span className="flex size-6">
                                                <ArrowRight className="m-auto size-3 text-white" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </AnimatedGroup> */}

                            {/* Split heading: left = Stop/Start, right = Managing./Growing. */}
                            <h1 className="w-full text-4xl font-extrabold italic text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] md:text-7xl lg:text-5xl xl:text-7xl tracking-tighter">
                                <span className="flex w-full justify-between items-baseline">
                                    <span>Stop.</span>
                                    <span>Managing.</span>
                                </span>
                                
                                <span className="flex w-full justify-between items-baseline">
                                    <span>Start</span>
                                    <span>Growing.</span>
                                </span>
                            </h1>
                            <TextEffect
                                per="line"
                                preset="fade-in-blur"
                                speedSegment={1}
                                delay={0.2}
                                as="p"
                                className="mt-28 inline-block w-fit whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)] backdrop-blur-md min-[360px]:text-[13px] md:mt-8 md:px-5 md:text-lg">
                                The AI operating system for modern schools.
                            </TextEffect>

                            {/* <AnimatedGroup
                                variants={{
                                    container: {
                                        visible: {
                                            transition: {
                                                staggerChildren: 0.05,
                                                delayChildren: 0.35,
                                            },
                                        },
                                    },
                                    ...transitionVariants,
                                }}
                                className="mt-10 flex flex-col items-center justify-center gap-2 md:flex-row">
                                <div
                                    key={1}
                                    className="rounded-[calc(var(--radius-xl)+0.125rem)] border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="rounded-xl px-5 text-base shadow-lg shadow-black/20 cursor-pointer">
                                        <a
                                            data-cal-namespace="acadify-demo"
                                            data-cal-link="mubashir2910/acadify-demo"
                                            data-cal-config='{"layout":"month_view"}'
                                        >
                                            <span className="text-nowrap">Book a School Demo</span>
                                        </a>
                                    </Button>
                                </div>
                                <Button
                                    key={2}
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-10.5 rounded-xl border border-white/25 bg-white/10 px-5 text-white backdrop-blur-md hover:bg-white/20 hover:text-white">
                                    <Link href="#how-it-works">
                                        <span className="text-nowrap">See How It Works</span>
                                    </Link>
                                </Button>
                            </AnimatedGroup> */}
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
