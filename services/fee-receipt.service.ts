import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { prisma } from "@/lib/prisma"
import {
  formatDateIST,
  formatDateTimeIST,
  loadSchoolBrandAssets,
} from "@/lib/pdf-branding"

export type ReceiptData = Awaited<ReturnType<typeof loadReceiptData>>

export async function loadReceiptData(schoolId: string, transactionId: string) {
  const txn = await prisma.feeTransaction.findFirst({
    where: { id: transactionId, school_id: schoolId },
    include: {
      school: {
        select: {
          schoolName: true,
          schoolCode: true,
          currency: true,
          logo_url: true,
          motto: true,
          brand_color: true,
        },
      },
      student: {
        select: {
          admission_no: true,
          roll_no: true,
          class: true,
          section: true,
          user: { select: { name: true, username: true } },
        },
      },
      recordedBy: { select: { name: true, role: true } },
      verifiedBy: { select: { name: true } },
      allocations: {
        include: {
          ledger: {
            select: {
              head_name_snapshot: true,
              period_label: true,
              expected_amount: true,
              waiver_amount: true,
            },
          },
          monthly_late_fee: {
            select: {
              period_year: true,
              period_month: true,
              amount: true,
            },
          },
        },
      },
    },
  })
  if (!txn) throw new Error("TRANSACTION_NOT_FOUND")
  return txn
}

export async function buildReceiptPdf(receipt: ReceiptData): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // brand_color is intentionally ignored — receipt header is always neutral
  // white with the school logo + name. We still load the logo via brand assets.
  const branding = await loadSchoolBrandAssets({
    logo_url: receipt.school.logo_url,
    motto: receipt.school.motto,
    brand_color: receipt.school.brand_color,
  })

  // Embed logo at a fixed max size; aspect ratio preserved.
  const LOGO_MAX = 56
  let embeddedLogo:
    | { width: number; height: number; img: Awaited<ReturnType<typeof pdfDoc.embedPng>> }
    | null = null
  if (branding.logoBytes && branding.logoMime) {
    try {
      const img =
        branding.logoMime === "image/png"
          ? await pdfDoc.embedPng(branding.logoBytes)
          : await pdfDoc.embedJpg(branding.logoBytes)
      const scale = Math.min(LOGO_MAX / img.height, LOGO_MAX / img.width)
      embeddedLogo = {
        img,
        width: img.width * scale,
        height: img.height * scale,
      }
    } catch (err) {
      console.warn("[buildReceiptPdf] logo embed failed", err)
    }
  }

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // --- White header (no brand-color band) -----------------------------------
  // Logo at top-left, school name + motto + "Fee Payment Receipt" beside it.
  const headerTop = y
  let nameX = margin
  if (embeddedLogo) {
    page.drawImage(embeddedLogo.img, {
      x: margin,
      y: headerTop - embeddedLogo.height,
      width: embeddedLogo.width,
      height: embeddedLogo.height,
    })
    nameX = margin + embeddedLogo.width + 14
  }

  const nameY = headerTop - 18
  page.drawText(receipt.school.schoolName, {
    x: nameX,
    y: nameY,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  })
  let textCursorY = nameY - 14
  if (branding.motto) {
    page.drawText(branding.motto, {
      x: nameX,
      y: textCursorY,
      size: 9,
      font: italicFont,
      color: rgb(0.45, 0.45, 0.45),
    })
    textCursorY -= 12
  }
  page.drawText("Fee Payment Receipt", {
    x: nameX,
    y: textCursorY,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Receipt meta — each line is right-aligned to the page's right margin
  // independently. Fixed `x` was causing the meta column to collide with
  // long school names; computing per-line width pushes the text against
  // the right edge regardless of name length.
  const rightEdge = pageWidth - margin
  const drawRightAligned = (
    text: string,
    yPos: number,
    f: typeof font,
    size: number,
    color: ReturnType<typeof rgb>,
  ) => {
    const width = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: rightEdge - width, y: yPos, size, font: f, color })
  }

  const timeOnly = formatDateTimeIST(receipt.created_at).split(", ").slice(1).join(", ")
  drawRightAligned(
    `Receipt No: ${receipt.receipt_no}`,
    headerTop - 18,
    boldFont,
    10,
    rgb(0, 0, 0),
  )
  drawRightAligned(
    `Date: ${formatDateIST(receipt.paid_at)}`,
    headerTop - 32,
    font,
    10,
    rgb(0.3, 0.3, 0.3),
  )
  drawRightAligned(`Time: ${timeOnly}`, headerTop - 46, font, 10, rgb(0.3, 0.3, 0.3))
  drawRightAligned(
    `Status: ${receipt.status}`,
    headerTop - 60,
    font,
    10,
    receipt.status === "VERIFIED" ? rgb(0.0, 0.5, 0.0) : rgb(0.6, 0.4, 0),
  )

  // Compute lowest baseline used by either header column, leave a gap, draw a rule.
  const headerBaseLeft = embeddedLogo ? headerTop - embeddedLogo.height : textCursorY
  const headerBaseRight = headerTop - 60
  const headerBottom = Math.min(headerBaseLeft, headerBaseRight) - 12
  page.drawLine({
    start: { x: margin, y: headerBottom },
    end: { x: pageWidth - margin, y: headerBottom },
    thickness: 0.75,
    color: rgb(0.82, 0.82, 0.82),
  })
  y = headerBottom - 20

  // --- Student block -------------------------------------------------------
  page.drawText("Student Details", {
    x: margin,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 18
  const studentLines = [
    `Name:           ${receipt.student.user.name}`,
    `Student ID:     ${receipt.student.user.username}`,
    `Class/Section:  ${receipt.student.class} / ${receipt.student.section}`,
    `Roll No:        ${receipt.student.roll_no}`,
    receipt.student.admission_no ? `Admission No:   ${receipt.student.admission_no}` : null,
  ].filter(Boolean) as string[]
  for (const line of studentLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    y -= 14
  }
  y -= 12

  // --- Allocations table ---------------------------------------------------
  const currency = receipt.school.currency || "INR"
  const headers = ["Fee Head", "Period", "Amount"]
  const colWidths = [240, 160, 95]
  // Neutral light-gray header bar (replaces brand color).
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: pageWidth - margin * 2,
    height: 22,
    color: rgb(0.95, 0.95, 0.95),
  })
  let x = margin
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: x + 6,
      y: y + 4,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    x += colWidths[i]
  }
  y -= 28

  const MONTH_LABELS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  for (const alloc of receipt.allocations) {
    let cx = margin
    // Prefer the per-allocation snapshot so receipts stay reprintable even
    // if the ledger / late-fee row was later detached or deleted. Fall
    // back to the joined relation for legacy allocations created before
    // snapshots existed.
    let headLabel = alloc.head_name_snapshot ?? "—"
    let periodLabel = alloc.period_label_snapshot ?? "—"
    if (!alloc.head_name_snapshot) {
      if (alloc.ledger) {
        headLabel = alloc.ledger.head_name_snapshot
      } else if (alloc.monthly_late_fee) {
        headLabel = "Late Fee"
      }
    }
    if (!alloc.period_label_snapshot) {
      if (alloc.ledger) {
        periodLabel = alloc.ledger.period_label
      } else if (alloc.monthly_late_fee) {
        periodLabel = `${MONTH_LABELS_SHORT[alloc.monthly_late_fee.period_month - 1]} ${alloc.monthly_late_fee.period_year}`
      }
    }
    page.drawText(headLabel, {
      x: cx + 4,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    cx += colWidths[0]
    page.drawText(periodLabel, {
      x: cx + 4,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    cx += colWidths[1]
    page.drawText(
      `${currency} ${Number(alloc.amount_applied).toFixed(2)}`,
      { x: cx + 4, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) },
    )
    y -= 16
  }

  // Total
  y -= 14
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: pageWidth - margin, y: y + 8 },
    thickness: 0.75,
    color: rgb(0.5, 0.5, 0.5),
  })
  page.drawText("Total Paid", {
    x: pageWidth - margin - 200,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  page.drawText(`${currency} ${Number(receipt.amount).toFixed(2)}`, {
    x: pageWidth - margin - 95,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  y -= 36

  // Payment meta
  const metaLines = [
    `Method:        ${receipt.method}`,
    receipt.external_txn_ref ? `Reference:     ${receipt.external_txn_ref}` : null,
    receipt.recordedBy ? `Recorded by:   ${receipt.recordedBy.name}` : null,
    receipt.verifiedBy ? `Verified by:   ${receipt.verifiedBy.name}` : null,
    receipt.notes ? `Notes:         ${receipt.notes}` : null,
  ].filter(Boolean) as string[]
  for (const line of metaLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    y -= 14
  }

  y -= 24
  page.drawText(
    "This is a system-generated receipt. Please retain for your records.",
    {
      x: margin,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    },
  )

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes).toString("base64")
}
