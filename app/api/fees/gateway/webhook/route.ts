import { NextResponse } from "next/server"

/**
 * STUB — gateway webhook. Returns 501 until the gateway SDK integration
 * lands. The body that ships here MUST follow this order, or it becomes a
 * critical security hole:
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ AUDIT H6 — security requirements for the webhook handler:     │
 *   │                                                               │
 *   │ 1. Read the raw request body BEFORE any JSON parsing.         │
 *   │ 2. Compute HMAC-SHA256(rawBody, SchoolPaymentConfig.          │
 *   │    gateway_webhook_secret) and compare against the signature  │
 *   │    header in CONSTANT TIME (`crypto.timingSafeEqual`).        │
 *   │    Reject with 401 on mismatch — no DB read, no logging the   │
 *   │    payload (it may be attacker-controlled spam).              │
 *   │ 3. Only then parse JSON, look up the FeeTransaction by        │
 *   │    gateway_order_id, and use a conditional updateMany         │
 *   │    (where: { status: 'PENDING_VERIFICATION' }) to flip to     │
 *   │    VERIFIED — count check guards replay attacks.              │
 *   │ 4. Recompute ledger + late-fee status inside the same tx.     │
 *   │                                                               │
 *   │ Skipping step 2 lets ANY attacker POST a fake                 │
 *   │ "payment_succeeded" event and force a transaction VERIFIED.   │
 *   │ This is the #1 way payment-gateway webhooks get exploited.    │
 *   └───────────────────────────────────────────────────────────────┘
 */
export async function POST() {
  return NextResponse.json(
    { message: "Webhook not yet implemented", code: "GATEWAY_NOT_IMPLEMENTED" },
    { status: 501 },
  )
}
