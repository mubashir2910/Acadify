import { NextResponse } from "next/server"
import { contactFormSchema } from "@/schemas/contact.schema"
import { ZodError } from "zod"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validated = contactFormSchema.parse(body)

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.CONTACT_EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"Acadify Contact" <${process.env.CONTACT_EMAIL}>`,
      to: process.env.CONTACT_EMAIL,
      replyTo: validated.email,
      subject: `New Contact Message from ${validated.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">New Contact Form Submission</h2>
          <hr style="border: none; border-top: 1px solid #e2e8f0;" />
          <p><strong>Name:</strong> ${validated.name}</p>
          <p><strong>Email:</strong> ${validated.email}</p>
          <p><strong>Message:</strong></p>
          <div style="padding: 16px; background: #f8fafc; border-radius: 8px; white-space: pre-wrap;">${validated.message}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
          <p style="font-size: 12px; color: #94a3b8;">Sent from the Acadify contact form</p>
        </div>
      `,
    })

    return NextResponse.json({ message: "Message sent successfully" })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    console.error("Contact email error:", error)
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 }
    )
  }
}
