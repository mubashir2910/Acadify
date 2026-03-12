import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters long")
    .max(1000, "Message must not exceed 1000 characters"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
