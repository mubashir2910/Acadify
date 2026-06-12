import { NextResponse } from "next/server"
import { auth } from "@/auth"

/**
 * STUB — FULL_ONLINE gateway order creation. Will create a Razorpay/Cashfree order,
 * persist a PENDING_VERIFICATION transaction, and return the gateway order details
 * for the frontend to launch the checkout. The webhook (separate route) is the
 * single source of truth for marking the transaction VERIFIED.
 *
 * Phase 1 returns 501 NOT_IMPLEMENTED — schema and architecture are in place but
 * the gateway SDK integration is deliberately deferred.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json(
    {
      message: "Online payments are coming soon. Please contact your school for offline options.",
      code: "GATEWAY_NOT_IMPLEMENTED",
    },
    { status: 501 },
  )
}
