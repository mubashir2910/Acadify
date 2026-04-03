export function audienceLabel(
  audience: string,
  targetClass: string | null,
  targetSection: string | null
): string {
  const classTag = targetClass
    ? targetSection
      ? `Class ${targetClass}-${targetSection}`
      : `All of Class ${targetClass}`
    : null

  if (audience === "STUDENT") return classTag ? `Students · ${classTag}` : "All Students"
  if (audience === "TEACHER") return classTag ? `Teachers · ${classTag}` : "All Teachers"
  return classTag ? `Everyone · ${classTag}` : "Everyone"
}
