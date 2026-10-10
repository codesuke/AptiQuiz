type SessionForRole = { user: { email: string; emailVerified: boolean } } | null;

export type Role = "guest" | "user" | "admin";

export function resolveRole(session: SessionForRole, adminEmails = process.env.ADMIN_EMAILS): Role {
  if (!session) return "guest";
  if (!session.user.emailVerified) return "user";

  const email = session.user.email.trim().toLowerCase();
  const isAdmin = (adminEmails ?? "")
    .split(",")
    .some((candidate) => candidate.trim().toLowerCase() === email);
  return isAdmin ? "admin" : "user";
}
