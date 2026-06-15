# Acadify — Architecture Overview

## Tech Stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| Framework    | **Next.js 16** (App Router)                    |
| Language     | TypeScript 5                                   |
| Styling      | Tailwind CSS 4 + `tw-animate-css`              |
| UI Library   | Radix UI + shadcn components                   |
| Animations   | Motion (Framer Motion)                         |
| Fonts        | Poppins (primary), Libre Baskerville, Geist Mono |
| Database     | PostgreSQL via **Prisma 7**                     |
| Images       | ImageKit CDN (`ik.imagekit.io`)                |

## Directory Structure

```
acadify/
├── app/                     # Next.js App Router pages & layouts
│   ├── layout.tsx           # Root layout (fonts, metadata)
│   ├── page.tsx             # Landing page (hero → amplification → works → pricing → footer)
│   ├── globals.css          # Global styles & Tailwind theme
│   ├── about/               # About page
│   └── super-admins/        # Super-admin dashboard
│       ├── page.tsx
│       └── components/      # Super-admin UI components (AddSchool, etc.)
├── components/              # Shared UI components
│   ├── header.tsx           # Site header / navigation
│   ├── hero-section.tsx     # Landing hero section
│   ├── amplification.tsx    # "Acadify System" features section
│   ├── works.tsx            # "How It Works" section
│   ├── pricing.tsx          # Pricing plans section
│   ├── footer.tsx           # Site footer
│   ├── logo.tsx             # Logo component
│   └── ui/                  # shadcn / primitive UI components
│       ├── button.tsx
│       ├── animated-group.tsx
│       └── text-effect.tsx
├── lib/                     # Shared utilities
│   ├── prisma.ts            # Prisma client singleton
│   └── utils.ts             # cn() and helpers
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Prisma migrations
├── public/                  # Static assets
└── .agent/workflows/        # Agent workflows
```

## Data Model (Prisma)

```
User ──┬── SchoolUser ──── School
       ├── Student ──────── School
       └── Teacher ──────── School
```

### Key Models

- **User** — Auth entity with username/email/password. Can have multiple school roles.
- **School** — Institution with subscription tracking (trial/active/suspended/cancelled).
- **SchoolUser** — Join table linking users to schools with a `Role` (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT).
- **Student** — Student record in a school (admission no, class, section, guardian info).
- **Teacher** — Teacher record in a school (employee ID, joining date).

### Enums

| Enum                | Values                                      |
| ------------------- | ------------------------------------------- |
| `Role`              | SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT |
| `SubscriptionStatus`| TRIAL, ACTIVE, SUSPENDED, CANCELLED         |
| `SchoolStatus`      | ACTIVE, INACTIVE                            |
| `RecordStatus`      | ACTIVE, INACTIVE, TRANSFERRED               |

## Key Conventions

- **Path aliases**: `@/` maps to project root (e.g. `@/components/ui/button`)
- **Prisma singleton**: import from `@/lib/prisma` — uses global caching in development
- **CSS variables for fonts**: `--font-poppins`, `--font-libre-baskerville`, `--font-geist-mono`
- **Component colocation**: Route-specific components live under `app/<route>/components/`
- **Shared components**: Reusable components go in top-level `components/`