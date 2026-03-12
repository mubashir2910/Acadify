Frontend should follow a component-based architecture.

Each UI feature should be broken into reusable components.

Example structure:

components/
   ui/
   forms/
   layout/
Design Principles

Frontend must follow:

Responsive design

Accessible UI

Consistent spacing and layout

Predictable component behavior

State Management

Prefer simple local state when possible.

Use libraries only when necessary.

Performance

Optimize frontend performance by:

Lazy loading components

Avoiding unnecessary re-renders

Minimizing large bundle sizes

UI Documentation

Important UI components should include documentation explaining:

Props

Usage examples

Expected behavior

Component Usage Rules

Before creating a new component:

Check the components directory.

Reuse existing components if available.

Example:

If a Button component exists, use it instead of raw HTML:

❌ Incorrect:

<button>Submit</button>

✅ Correct:

<Button>Submit</Button>
Page Structure Rules

Inside the app router:

Keep page.tsx files clean.

A page should mainly import and render components.

Example:

app/schools/create/page.tsx

Should only contain:

<SchoolForm />

Avoid writing large UI logic inside page.tsx.

Route-Level Components

If a component is only used within one route, store it inside that route.

Example:

app/schools/create/
   page.tsx
   components/
       school-form.tsx
       school-header.tsx
Global Reusable Components

Reusable components must go in:

components/

Example:

components/
   button.tsx
   input.tsx
   modal.tsx
Cross Browser Support

Ensure UI works across modern browsers:

Chrome

Firefox

Edge

Safari

Third-Party Libraries

When introducing a library:

Document why it is used

Explain where it is used

Avoid unnecessary dependencies.

Component Testing

Important UI components should include tests.

Example components to test:

Buttons

Form components

Modals

Navigation

Additional Recommended Rule

Encourage the use of Zod schemas as the single validation source.

Prefer validating:

On frontend forms

On backend API routes

This ensures consistent validation across the system.