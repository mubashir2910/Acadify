"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { School } from "./SchoolCard"

interface ImportSummary {
  total: number
  imported: number
  failed: number
}

interface ImportStudentsModalProps {
  school: School
  onClose: () => void
}

type ImportState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "success"; summary: ImportSummary }
  | { phase: "error"; errors: string[]; summary: ImportSummary }

const SAMPLE_CSV =
  "name,email,admission_no,roll_no,class,section,phone,guardian_name,guardian_phone,date_of_birth\n" +
  "John Doe,john@example.com,ADM001,101,10,A,+920000000000,Jane Doe,+921111111111,15-08-2008\n" +
  "Jane Smith,,ADM002,102,10,A,,Robert Smith,+922222222222,22-03-2009"

const STUDENT_CSV_FIELDS = [
  { name: "name", required: true },
  { name: "roll_no", required: true },
  { name: "class", required: true },
  { name: "section", required: true },
  { name: "guardian_name", required: true },
  { name: "guardian_phone", required: true },
  { name: "date_of_birth", required: true, note: "DD-MM-YYYY or YYYY-MM-DD" },
  { name: "email", required: false },
  { name: "phone", required: false },
  { name: "admission_no", required: false, note: "School's existing number" },
]

export default function ImportStudentsModal({
  school,
  onClose,
}: ImportStudentsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importState, setImportState] = useState<ImportState>({ phase: "idle" })

  function handleDownloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "student_import_sample.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file && !file.name.toLowerCase().endsWith(".csv")) {
      alert("Only .csv files are accepted")
      e.target.value = ""
      return
    }
    setSelectedFile(file)
    setImportState({ phase: "idle" })
  }

  function triggerPdfDownload(base64: string, filename: string) {
    const byteString = atob(base64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    if (!selectedFile) {
      alert("Please select a CSV file first")
      return
    }

    setImportState({ phase: "uploading" })

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await fetch(
        `/api/schools/${school.schoolCode}/import/students`,
        { method: "POST", body: formData }
      )

      const data = await res.json()

      if (data.success === true) {
        setImportState({ phase: "success", summary: data.summary })
        if (data.pdf) {
          triggerPdfDownload(data.pdf, `${school.schoolCode}_student_credentials.pdf`)
        }
        if (data.classSectionPdfs) {
          data.classSectionPdfs.forEach((item: { filename: string; pdf: string }, i: number) => {
            setTimeout(() => triggerPdfDownload(item.pdf, item.filename), 150 * (i + 1))
          })
        }
      } else {
        setImportState({
          phase: "error",
          errors: data.errors ?? [data.message ?? "Import failed"],
          summary: data.summary ?? { total: 0, imported: 0, failed: 0 },
        })
      }
    } catch {
      setImportState({
        phase: "error",
        errors: ["Network error — please try again"],
        summary: { total: 0, imported: 0, failed: 0 },
      })
    }
  }

  const isUploading = importState.phase === "uploading"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Import Students — {school.schoolName}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">CSV File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0
              file:text-sm file:font-medium file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90 cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Accepted: .csv only · Max size: 5MB
          </p>
        </div>

        {/* CSV Field Guide */}
        <details className="group">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none">
            View CSV column reference
          </summary>
          <div className="mt-2 border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-3 py-1.5 font-medium">Column</th>
                  <th className="text-center px-3 py-1.5 font-medium w-20">Required</th>
                  <th className="text-left px-3 py-1.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {STUDENT_CSV_FIELDS.map((f) => (
                  <tr key={f.name} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-mono">{f.name}</td>
                    <td className="px-3 py-1.5 text-center">
                      {f.required ? (
                        <span className="text-green-600 font-semibold">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{f.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* Result: success */}
        {importState.phase === "success" && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm space-y-1">
            <p className="font-semibold text-green-800">Import successful!</p>
            <p className="text-green-700">
              Total rows: {importState.summary.total}
            </p>
            <p className="text-green-700">
              Imported: {importState.summary.imported}
            </p>
            <p className="text-green-700">
              Failed: {importState.summary.failed}
            </p>
            <p className="text-green-600 text-xs mt-1">
              Credentials PDF has been downloaded automatically.
            </p>
          </div>
        )}

        {/* Result: error */}
        {importState.phase === "error" && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-red-800">Import failed</p>
              <span className="text-xs text-red-600">
                {importState.errors.length} error(s)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
              {importState.errors.map((err, i) => (
                <li key={i} className="text-red-700 text-xs">
                  {err}
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-500">
              Please fix the errors and try again.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-1">
          <Button variant="outline" size="sm" onClick={handleDownloadSample}>
            Download Sample CSV
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
