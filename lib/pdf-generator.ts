import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

interface StudentCredential {
  name: string
  studentUniqueId: string
  class: string
  section: string
  roll_no: string
  temporaryPassword: string
}

/**
 * Generates a credentials PDF and returns it as a base64 string.
 * Includes school name header and a table of student credentials.
 */
export async function generateCredentialsPdf(
  schoolName: string,
  students: StudentCredential[]
): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const rowHeight = 22
  const colWidths = [155, 80, 45, 50, 60, 105]
  const headers = ["Student Name", "Student ID", "Class", "Section", "Roll No", "Temp Password"]

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // School name header
  page.drawText(schoolName, {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  y -= 18

  page.drawText("Student Credentials — Confidential", {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 30

  function drawTableHeader(page: ReturnType<typeof pdfDoc.addPage>, y: number) {
    let x = margin
    for (let i = 0; i < headers.length; i++) {
      page.drawRectangle({
        x,
        y: y - 5,
        width: colWidths[i],
        height: rowHeight,
        color: rgb(0.15, 0.15, 0.15),
      })
      page.drawText(headers[i], {
        x: x + 5,
        y: y + 2,
        size: 9,
        font: boldFont,
        color: rgb(1, 1, 1),
      })
      x += colWidths[i]
    }
    return y - rowHeight - 2
  }

  y = drawTableHeader(page, y)

  for (let i = 0; i < students.length; i++) {
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      y = drawTableHeader(page, y)
    }

    const { name, studentUniqueId, class: cls, section, roll_no, temporaryPassword } = students[i]
    const rowData = [name, studentUniqueId, cls, section, roll_no, temporaryPassword]
    const bgColor = i % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1)

    let x = margin
    for (let j = 0; j < rowData.length; j++) {
      page.drawRectangle({
        x,
        y: y - 5,
        width: colWidths[j],
        height: rowHeight,
        color: bgColor,
      })
      page.drawText(rowData[j].slice(0, 30), {
        x: x + 5,
        y: y + 2,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      })
      x += colWidths[j]
    }
    y -= rowHeight
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes).toString("base64")
}

interface TeacherCredential {
  name: string
  teacherUniqueId: string
  temporaryPassword: string
}

/**
 * Generates a teacher credentials PDF and returns it as a base64 string.
 */
export async function generateTeacherCredentialsPdf(
  schoolName: string,
  teachers: TeacherCredential[]
): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const rowHeight = 22
  const colWidths = [210, 130, 155]
  const headers = ["Teacher Name", "Teacher ID", "Temp Password"]

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  page.drawText(schoolName, {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  y -= 18

  page.drawText("Teacher Credentials — Confidential", {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 30

  function drawTableHeader(page: ReturnType<typeof pdfDoc.addPage>, y: number) {
    let x = margin
    for (let i = 0; i < headers.length; i++) {
      page.drawRectangle({
        x,
        y: y - 5,
        width: colWidths[i],
        height: rowHeight,
        color: rgb(0.15, 0.15, 0.15),
      })
      page.drawText(headers[i], {
        x: x + 5,
        y: y + 2,
        size: 9,
        font: boldFont,
        color: rgb(1, 1, 1),
      })
      x += colWidths[i]
    }
    return y - rowHeight - 2
  }

  y = drawTableHeader(page, y)

  for (let i = 0; i < teachers.length; i++) {
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      y = drawTableHeader(page, y)
    }

    const { name, teacherUniqueId, temporaryPassword } = teachers[i]
    const rowData = [name, teacherUniqueId, temporaryPassword]
    const bgColor = i % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1)

    let x = margin
    for (let j = 0; j < rowData.length; j++) {
      page.drawRectangle({
        x,
        y: y - 5,
        width: colWidths[j],
        height: rowHeight,
        color: bgColor,
      })
      page.drawText(rowData[j].slice(0, 30), {
        x: x + 5,
        y: y + 2,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      })
      x += colWidths[j]
    }
    y -= rowHeight
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes).toString("base64")
}
