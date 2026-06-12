/**
 * Playbook content + data model.
 *
 * The "Acadify Playbook" is a premium, interactive feature tour rendered as a
 * book that opens to a two-page spread (text on the left, an image on the
 * right). This module is the single source of truth for the pages.
 *
 * The right-hand image is a per-chapter field (currently the shared
 * `/image.png` placeholder) so real product screenshots can be dropped in
 * later by editing only this file.
 */

import {
    BarChart3,
    ClipboardCheck,
    CreditCard,
    FolderArchive,
    Gamepad2,
    MessageSquare,
    type LucideIcon,
} from 'lucide-react'

export type Chapter = {
    /** 1-based chapter number, rendered as a Roman numeral ("CHAPTER I"). */
    chapterNo: number
    icon: LucideIcon
    title: string
    /** Accent one-liner — the headline benefit. */
    benefit: string
    /** Two-line supporting description. */
    description: string
    /** Static Tailwind classes (Tailwind can't generate these dynamically). */
    accentText: string
    accentBg: string
    /** Right-hand page image. Swap per-chapter when real screenshots exist. */
    image: string
}

/** Discriminated union so the engine can render every page uniformly. */
export type PlaybookPage =
    | { kind: 'cover' }
    | { kind: 'chapter'; chapter: Chapter }
    | { kind: 'cta' }

const PLACEHOLDER_IMAGE = '/image.png'

export const CHAPTERS: Chapter[] = [
    {
        chapterNo: 1,
        icon: ClipboardCheck,
        title: 'Attendance Tracking',
        benefit: 'Never lose attendance records.',
        description:
            'Mark attendance in a single tap, with real-time visibility for teachers, parents and staff.',
        accentText: 'text-emerald-600',
        accentBg: 'bg-emerald-50',
        image: PLACEHOLDER_IMAGE,
    },
    {
        chapterNo: 2,
        icon: FolderArchive,
        title: 'Class Log',
        benefit: 'Every lesson documented.',
        description:
            'Track exactly what was taught — chapter-wise and day-wise — without the paperwork.',
        accentText: 'text-violet-600',
        accentBg: 'bg-violet-50',
        image: PLACEHOLDER_IMAGE,
    },
    {
        chapterNo: 3,
        icon: BarChart3,
        title: 'Reports & Analytics',
        benefit: 'Data that drives decisions.',
        description:
            'Beautiful reports and smart analytics turn raw numbers into clarity you can act on.',
        accentText: 'text-sky-600',
        accentBg: 'bg-sky-50',
        image: PLACEHOLDER_IMAGE,
    },
    {
        chapterNo: 4,
        icon: MessageSquare,
        title: 'Communication Hub',
        benefit: 'Everyone on the same page.',
        description:
            'Reach every parent and teacher instantly — one message can travel to a whole class.',
        accentText: 'text-amber-600',
        accentBg: 'bg-amber-50',
        image: PLACEHOLDER_IMAGE,
    },
    {
        chapterNo: 5,
        icon: CreditCard,
        title: 'Fee Management',
        benefit: 'Fees, finally effortless.',
        description:
            'Automated collection, invoices and receipts — with gentle reminders that chase for you.',
        accentText: 'text-rose-600',
        accentBg: 'bg-rose-50',
        image: PLACEHOLDER_IMAGE,
    },
    {
        chapterNo: 6,
        icon: Gamepad2,
        title: 'ACADIFY Arena',
        benefit: 'Learning they actually love.',
        description:
            'Gamified, AI-powered quizzes that turn everyday practice into friendly competition.',
        accentText: 'text-indigo-600',
        accentBg: 'bg-indigo-50',
        image: PLACEHOLDER_IMAGE,
    },
]

/** Ordered pages: cover → 6 chapters → closing CTA. */
export const playbookPages: PlaybookPage[] = [
    { kind: 'cover' },
    ...CHAPTERS.map((chapter) => ({ kind: 'chapter', chapter }) as PlaybookPage),
    { kind: 'cta' },
]

export const LAST_PAGE = playbookPages.length - 1
export const CHAPTER_COUNT = CHAPTERS.length

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const toRoman = (n: number) => ROMAN[n - 1] ?? String(n)
