export function generateTeacherUniqueId(schoolCode: string, sequence: number): string {
  return `${schoolCode}T${String(sequence).padStart(3, "0")}`
}
