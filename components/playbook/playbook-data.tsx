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
    CalendarClock,
    Gift,
    Contact,
    IdCard,
    FileCheck,
    Map,
    TrendingUp,
    Search,
    Zap,
    QrCode,
    Leaf,
    CheckSquare,
    MousePointerClick,
    PieChart,
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
    {
        chapterNo: 7,
        icon: CalendarClock,
        title: 'Smart Time Table',
        benefit: 'No more scheduling chaos.',
        description:
            'Effortlessly plan and manage class schedules without the puzzle. Say goodbye to overlapping classes and confused students.',
        why: 'Built to make complex school scheduling as simple as drag-and-drop.',
        highlights: [
            { icon: ShieldCheck, label: 'Auto-conflict Check' },
            { icon: Users, label: 'For Teachers & Students' },
            { icon: RefreshCw, label: 'Real-time Sync' },
        ],
        accentText: 'text-teal-600',
        accentBg: 'bg-teal-50',
        image: '/assets/playbook/time_table.png',
    },
    {
        chapterNo: 8,
        icon: CalendarDays,
        title: 'Interactive Calendar',
        benefit: 'Every event, perfectly synced.',
        description:
            'Keep everyone aligned on holidays, exams, and school events. One unified calendar that keeps the whole school moving together.',
        why: "Designed to eliminate the 'I didn't know' from school events.",
        highlights: [
            { icon: Users, label: 'School-wide Events' },
            { icon: Gift, label: 'Custom Holidays' },
            { icon: RefreshCw, label: 'Always Current' },
        ],
        accentText: 'text-fuchsia-600',
        accentBg: 'bg-fuchsia-50',
        image: '/assets/playbook/calendar.png',
    },
    {
        chapterNo: 9,
        icon: Gift,
        title: 'Birthday Celebrations',
        benefit: 'Make every student feel special.',
        description:
            'Never miss a special day. Automatically track and celebrate student and staff birthdays to foster a warmer school culture.',
        why: 'Because small celebrations create a big sense of belonging.',
        highlights: [
            { icon: BellRing, label: 'Auto Reminders' },
            { icon: Users, label: 'Staff & Students' },
            { icon: MessageSquare, label: 'Heartfelt Greetings' },
        ],
        accentText: 'text-pink-600',
        accentBg: 'bg-pink-50',
        image: '/assets/playbook/birthdays.png',
    },
    {
        chapterNo: 10,
        icon: Contact,
        title: 'Smart Directory',
        benefit: 'Everyone, just a tap away.',
        description:
            'A centralized, lightning-fast directory of all students, teachers, and staff. Access emergency contacts and profiles in seconds.',
        why: "Designed to keep your school's entire community instantly accessible.",
        highlights: [
            { icon: Search, label: 'Lightning Fast Search' },
            { icon: Contact, label: 'Unified Profiles' },
            { icon: ShieldCheck, label: 'Secure Access' },
        ],
        accentText: 'text-cyan-600',
        accentBg: 'bg-cyan-50',
        image: '/assets/playbook/smart_directory.png',
    },
    {
        chapterNo: 11,
        icon: IdCard,
        title: 'Digital ID Cards',
        benefit: 'Identity that lives on their phone.',
        description:
            'Generate beautiful, secure digital ID cards instantly. No more lost plastic cards, just scan-ready credentials right in their pocket.',
        why: 'Built to modernize school identity and eliminate printing costs.',
        highlights: [
            { icon: Zap, label: 'Instant Generation' },
            { icon: QrCode, label: 'Secure QR Codes' },
            { icon: Leaf, label: 'Eco-friendly' },
        ],
        accentText: 'text-blue-600',
        accentBg: 'bg-blue-50',
        image: '/assets/playbook/digital_id.png',
    },
    {
        chapterNo: 12,
        icon: FileCheck,
        title: 'Exam Management',
        benefit: 'Manual grading, completely gone.',
        description:
            "Streamline the entire examination lifecycle. From scheduling tests to publishing results, we've automated the heavy lifting.",
        why: 'Designed to let teachers focus on teaching, not endless paperwork.',
        highlights: [
            { icon: CheckSquare, label: 'Automated Grading' },
            { icon: Zap, label: 'Instant Results' },
            { icon: LineChart, label: 'Insightful Analytics' },
        ],
        accentText: 'text-orange-600',
        accentBg: 'bg-orange-50',
        image: '/assets/playbook/digital_id.png',
    },
    {
        chapterNo: 13,
        icon: Map,
        title: 'Visual Learn Path',
        benefit: 'See exactly how they learn.',
        description:
            'Transform dry curriculums into rich, visual learning journeys. Students explore topics interactively, tracking their mastery step-by-step.',
        why: 'Built to make complex topics intuitive and engaging for every student.',
        highlights: [
            { icon: Map, label: 'Visual Roadmaps' },
            { icon: MousePointerClick, label: 'Interactive Topics' },
            { icon: Trophy, label: 'Mastery Tracking' },
        ],
        accentText: 'text-emerald-600',
        accentBg: 'bg-emerald-50',
        image: '/assets/playbook/digital_id.png',
    },
    {
        chapterNo: 14,
        icon: TrendingUp,
        title: 'Monthly Reports',
        benefit: 'Crystal clear growth tracking.',
        description:
            'Auto-generate comprehensive monthly snapshots of student progress. Keep parents informed and students motivated with beautiful insights.',
        why: 'Created to turn complex academic data into a simple story of growth.',
        highlights: [
            { icon: Sparkles, label: 'Auto-generated' },
            { icon: Users, label: 'Parent-friendly' },
            { icon: PieChart, label: 'Actionable Insights' },
        ],
        accentText: 'text-violet-600',
        accentBg: 'bg-violet-50',
        image: '/assets/playbook/digital_id.png',
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
