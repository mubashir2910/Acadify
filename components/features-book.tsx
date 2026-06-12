/**
 * Public entry for the landing-page feature book.
 *
 * The implementation now lives in `components/playbook/` (the premium
 * "Acadify Playbook" — a two-page spread on desktop, single-page flip on
 * mobile). This re-export keeps existing imports of `@/components/features-book`
 * working unchanged.
 */
export { default } from './playbook/playbook-book'
