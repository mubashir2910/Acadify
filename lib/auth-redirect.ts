/**
 * Returns the dashboard path for a given role.
 */
export function getDashboardPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admins"
    case "ADMIN":
      return "/admins"
    case "TEACHER":
      return "/teacher"
    case "STUDENT":
      return "/student"
    default:
      return "/login"
  }
}
