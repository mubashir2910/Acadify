import { z } from "zod"

export const createAdminSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username is too long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
})

export type CreateAdminInput = z.infer<typeof createAdminSchema>
