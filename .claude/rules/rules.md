Core Architectural Rules

The project follows strict separation of concerns.

Backend Interaction

The frontend must never interact directly with the database.

All database access must happen through services.

Correct flow:

Frontend
   ↓
API Route
   ↓
Service
   ↓
Database

API Layer
API routes must:

Handle HTTP requests

Validate input

Call service functions

Return responses

API routes must not contain business logic or database queries.

Service Layer
Services contain:

Business logic

Prisma queries

Application rules

Services must be reusable and modular.

Schema Validation (Recommended)

Use Zod schemas for input validation.

Prefer using the same schema for both frontend and backend validation to ensure consistent data validation.

Example flow:

Form → Zod Validation → API → Zod Validation → Service

Naming Conventions
Use consistent naming conventions:

Item	Convention
Prisma models	Singular
Database tables	Plural
Files	snake-case or entity based
Services	entity.service.ts
Schemas	entity.schema.ts

Example:

school.service.ts
school.schema.ts
Code Organization

Follow entity-based grouping.

Example:

services/
   school.service.ts
   teacher.service.ts
   student.service.ts

Each service file contains functions related to that entity.