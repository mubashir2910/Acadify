/**
 * Playbook content + data model.
 *
 * The "Acadify Playbook" is a premium, interactive feature tour rendered as a
 * book that opens to a two-page spread (text on the left, an illustration +
 * highlights on the right). This module is the single source of truth.
 *
 * Each chapter carries its own image (`/assets/playbook/*.png`), a one-line
 * "why it's designed" note, and three highlight blocks — all editable here.
 */

import {
    BarChart3,
    BellRing,
    CalendarDays,
    ClipboardCheck,
    Clock,
    CreditCard,
    Eye,
    FileText,
    FolderArchive,
    Gamepad2,
    LineChart,
    MessageSquare,
    Receipt,
    RefreshCw,
    Send,
    ShieldCheck,
    Sparkles,
    Trophy,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react'

/** A small "why it's built" block on the right page. */
export type Highlight = { icon: LucideIcon; label: string }

export type Chapter = {
    /** 1-based chapter number, rendered as a Roman numeral ("CHAPTER I"). */
    chapterNo: number
    icon: LucideIcon
    title: string
    /** Accent one-liner — the headline benefit. */
    benefit: string
    /** Two-line supporting description. */
    description: string
    /** One-line "why this feature is designed" (the shaded box). */
    why: string
    /** Exactly three highlight blocks for the right page. */
    highlights: Highlight[]
    /** Static Tailwind classes (Tailwind can't generate these dynamically). */
    accentText: string
    accentBg: string
    /** Right-hand page illustration (1254×1254). */
    image: string
}

/** Discriminated union so the engine can render every page uniformly. */
export type PlaybookPage =
    | { kind: 'cover' }
    | { kind: 'chapter'; chapter: Chapter }
    | { kind: 'cta' }

export const CHAPTERS: Chapter[] = [
    {
        chapterNo: 1,
        icon: ClipboardCheck,
        title: 'Attendance Tracking',
        benefit: 'Accuracy in every roll.',
        description:
            'Mark attendance in a single tap, with real-time visibility for teachers, parents and staff.',
        why: 'Designed to save time and ensure accurate records, every day.',
        highlights: [
            { icon: Clock, label: 'Real-time Updates' },
            { icon: Users, label: 'For Teachers, Parents & Staff' },
            { icon: ShieldCheck, label: 'Accurate & Reliable' },
        ],
        accentText: 'text-emerald-600',
        accentBg: 'bg-emerald-50',
        image: '/assets/playbook/attendance.png',
    },
    {
        chapterNo: 2,
        icon: FolderArchive,
        title: 'Class Log',
        benefit: 'Every lesson documented.',
        description:
            'Track exactly what was taught — chapter-wise and day-wise — without the paperwork.',
        why: 'Built so nothing taught ever slips through the cracks.',
        highlights: [
            { icon: CalendarDays, label: 'Day & Chapter-wise' },
            { icon: Eye, label: 'Visible to Parents' },
            { icon: FileText, label: 'Zero Paperwork' },
        ],
        accentText: 'text-violet-600',
        accentBg: 'bg-violet-50',
        image: '/assets/playbook/class_log.png',
    },
    {
        chapterNo: 3,
        icon: BarChart3,
        title: 'Reports & Analytics',
        benefit: 'Data that drives decisions.',
        description:
            'Beautiful reports and smart analytics turn raw numbers into clarity you can act on.',
        why: 'Made to turn everyday data into decisions you can act on.',
        highlights: [
            { icon: Sparkles, label: 'Auto-generated' },
            { icon: LineChart, label: 'Clear Insights' },
            { icon: RefreshCw, label: 'Always Current' },
        ],
        accentText: 'text-sky-600',
        accentBg: 'bg-sky-50',
        image: '/assets/playbook/reports_analytics.png',
    },
    {
        chapterNo: 4,
        icon: MessageSquare,
        title: 'Communication Hub',
        benefit: 'Everyone on the same page.',
        description:
            'Reach every parent and teacher instantly — one message can travel to a whole class.',
        why: 'Created to keep every parent and teacher effortlessly in sync.',
        highlights: [
            { icon: Send, label: 'Instant Reach' },
            { icon: Users, label: 'Whole Class at Once' },
            { icon: BellRing, label: 'Never Missed' },
        ],
        accentText: 'text-amber-600',
        accentBg: 'bg-amber-50',
        image: '/assets/playbook/communication_hub.png',
    },
    {
        chapterNo: 5,
        icon: CreditCard,
        title: 'Fee Management',
        benefit: 'Fees, finally effortless.',
        description:
            'Automated collection, invoices and receipts — with gentle reminders that chase for you.',
        why: 'Designed to make fee collection painless and fully transparent.',
        highlights: [
            { icon: BellRing, label: 'Auto Reminders' },
            { icon: Receipt, label: 'Instant Receipts' },
            { icon: Wallet, label: 'Clear Tracking' },
        ],
        accentText: 'text-rose-600',
        accentBg: 'bg-rose-50',
        image: '/assets/playbook/fee_management.png',
    },
    {
        chapterNo: 6,
        icon: Gamepad2,
        title: 'ACADIFY Arena',
        benefit: 'Learning they actually love.',
        description:
            'Gamified, AI-powered quizzes that turn everyday practice into friendly competition.',
        why: 'Built to make learning a game students look forward to.',
        highlights: [
            { icon: Gamepad2, label: 'Gamified Quizzes' },
            { icon: Sparkles, label: 'AI-powered' },
            { icon: Trophy, label: 'Friendly Competition' },
        ],
        accentText: 'text-indigo-600',
        accentBg: 'bg-indigo-50',
        image: '/assets/playbook/acadify_arena.png',
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
