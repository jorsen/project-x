import { auth } from "@/auth";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export async function getSession() {
  return auth();
}

export async function requireEditor() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "EDITOR") {
    throw new Error("Forbidden: editor or admin role required");
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
  return role === "ADMIN" || role === "EDITOR";
}
