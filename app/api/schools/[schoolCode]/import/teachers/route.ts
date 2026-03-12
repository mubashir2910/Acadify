import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { csvTeacherRowSchema } from "@/schemas/teacher.schema"
import { importTeachers } from "@/services/teacher.service"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const REQUIRED_HEADERS = ["name", "email"]

export async function POST(req: Request, { params }: RouteParams) {
  const { schoolCode } = await params

  try {
    // 1. Parse multipart/form-data
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 })
    }

    // 2. Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { message: "Only .csv files are accepted" },
        { status: 400 }
      )
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "File size exceeds the 5MB limit" },
        { status: 400 }
      )
    }

    // 4. Read file as text, strip UTF-8 BOM (Excel exports)
    const text = (await file.text()).replace(/^\uFEFF/, "")

    // 5. Split into non-empty lines
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length < 2) {
      return NextResponse.json(
        { message: "CSV file is empty or contains only a header row" },
        { status: 422 }
      )
    }

    // 6. Extract and validate headers
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { message: `CSV is missing required columns: ${missingHeaders.join(", ")}` },
        { status: 422 }
      )
    }

    // 7. Per-row Zod validation — collect ALL errors before returning
    const rowErrors: string[] = []
    const validRows: ReturnType<typeof csvTeacherRowSchema.parse>[] = []

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1 // row 1 = header, data rows start at row 2
      const values = lines[i].split(",").map((v) => v.trim())

      const rawRow: Record<string, string> = {}
      headers.forEach((header, colIdx) => {
        rawRow[header] = values[colIdx] ?? ""
      })

      try {
        const validated = csvTeacherRowSchema.parse(rawRow)
        validRows.push(validated)
      } catch (err) {
        if (err instanceof ZodError) {
          err.issues.forEach((issue) => {
            rowErrors.push(`Row ${rowNumber}: ${issue.message}`)
          })
        } else {
          rowErrors.push(`Row ${rowNumber}: Unknown validation error`)
        }
      }
    }

    // 8. All-or-nothing: if ANY row is invalid, return errors without inserting
    if (rowErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: rowErrors,
          summary: {
            total: lines.length - 1,
            imported: 0,
            failed: rowErrors.length,
          },
        },
        { status: 422 }
      )
    }

    // 9. All rows valid — call service to import
    const result = await importTeachers(schoolCode, validRows)

    if (!result.success) {
      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[import/teachers]", error)
    return NextResponse.json(
      { message: "Import failed due to an unexpected error" },
      { status: 500 }
    )
  }
}
