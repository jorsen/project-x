"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin, type Role } from "@/lib/authz";
import { parseTextInput } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";

const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];
// Deliberately excludes passwordHash — never record password data in the
// activity log, even hashed.
const USER_FIELDS = ["name", "employeeNumber", "role"];

function parseRole(value: FormDataEntryValue | null): Role {
  const str = typeof value === "string" ? value.trim() : "";
  if (!ROLES.includes(str as Role)) {
    throw new Error(`Invalid role: ${str}`);
  }
  return str as Role;
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const name = parseTextInput(formData.get("name"));
  const employeeNumber = parseTextInput(formData.get("employeeNumber"));
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));

  if (!name || !employeeNumber) {
    throw new Error("Name and employee number are required");
  }
  if (!password) {
    throw new Error("Password is required");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, employeeNumber, passwordHash, role },
  });

  await logActivity({
    action: "CREATE",
    entityType: "User",
    entityLabel: `${name} (#${employeeNumber})`,
    changes: diffFields(null, { name, employeeNumber, role }, USER_FIELDS),
  });
  revalidatePath("/users");
  redirect("/users?flash=User created");
}

export async function updateUserRole(id: string, formData: FormData) {
  await requireAdmin();

  const role = parseRole(formData.get("role"));

  const before = await prisma.user.findUnique({ where: { id } });
  const user = await prisma.user.update({
    where: { id },
    data: { role },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "User",
    entityLabel: `${user.name} (#${user.employeeNumber})`,
    changes: diffFields(before, { role }, ["role"]),
  });
  revalidatePath("/users");
  redirect("/users?flash=Role updated");
}

export async function resetUserPassword(id: string, formData: FormData) {
  await requireAdmin();

  const password = String(formData.get("password") ?? "");
  if (!password) {
    throw new Error("Password is required");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "User",
    entityLabel: `Password reset for ${user.name} (#${user.employeeNumber})`,
  });
  revalidatePath("/users");
  redirect("/users?flash=Password reset");
}

export async function deleteUser(id: string) {
  await requireAdmin();

  const session = await auth();
  if (session?.user?.id === id) {
    throw new Error("You cannot delete your own account");
  }

  const user = await prisma.user.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "User",
    entityLabel: `${user.name} (#${user.employeeNumber})`,
    changes: diffFields(user, null, USER_FIELDS),
  });
  revalidatePath("/users");
}
