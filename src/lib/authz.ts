import { auth } from "@/auth";

export type Role = "ADMIN" | "VIEWER";

export async function getSession() {
  return auth();
}

// Only ADMIN can create/edit/delete — VIEWER is read-only. Kept as a
// separate helper from requireAdmin() since it documents intent at each
// call site (data mutation vs. admin-only pages like Users).
export async function requireEditor() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden: admin role required");
  }
  return session!;
}

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden: admin role required");
  }
  return session!;
}

export function canEdit(role: Role | undefined) {
  return role === "ADMIN";
}
