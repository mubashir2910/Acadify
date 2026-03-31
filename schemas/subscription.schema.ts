import { z } from "zod"

export const updateSubscriptionSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]),
    subscription_ends_at: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === "ACTIVE" && !data.subscription_ends_at) {
        return false
      }
      return true
    },
    { message: "Subscription end date is required when status is ACTIVE", path: ["subscription_ends_at"] }
  )

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>
