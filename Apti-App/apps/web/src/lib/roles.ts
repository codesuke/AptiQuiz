type SessionForRole = { user: { email: string; emailVerified: boolean } } | null;

export type Role = "guest" | "user" | "admin";

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function resolveRole(session: SessionForRole, adminEmails = process.env.ADMIN_EMAILS): Role {
  if (!session) return "guest";
  if (!session.user.emailVerified) return "user";

  const email = normalizeEmail(session.user.email);
  if (!email) return "user";
  const isAdmin = (adminEmails ?? "")
    .split(",")
    .some((candidate) => normalizeEmail(candidate) === email);
  return isAdmin ? "admin" : "user";
}
