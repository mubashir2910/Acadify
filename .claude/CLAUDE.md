Project Overview

This project follows a clean SaaS architecture where responsibilities are clearly separated across layers.

The system flow:

Frontend UI
   ↓
API Routes
   ↓
Services (Business Logic)
   ↓
Prisma ORM

Frontend components must never directly communicate with the database.

Project Directory Overview
app/
   api/                 → API routes (HTTP handlers)

components/             → Reusable UI components
   forms/               → Form components

services/               → Business logic layer

schemas/                → Zod validation schemas

lib/
   prisma.ts            → Prisma client instance

prisma/
   schema.prisma        → Database schema

types/                  → Shared TypeScript types

Security Rules
After implementing any change, always re-review the code to check for potential security vulnerabilities, application crash risks, and unhandled edge cases. Ensure that inputs are properly validated, APIs are protected from misuse, and the changes do not introduce regressions or stability issues.

IMPORTANT:
If any file already exists, modify it instead of creating duplicates.
Follow existing project conventions.