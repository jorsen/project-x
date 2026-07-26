"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin, type Role } from "@/lib/authz";
import { parseTextInput } from "@/lib/format";

const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

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
  const email = parseTextInput(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));

  if (!name || !email) {
    throw new Error("Name and email are required");
  }
  if (!password) {
    throw new Error("Password is required");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUserRole(id: string, formData: FormData) {
  await requireAdmin();

  const role = parseRole(formData.get("role"));

  await prisma.user.update({
    where: { id },
    data: { role },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function resetUserPassword(id: string, formData: FormData) {
  await requireAdmin();

  const password = String(formData.get("password") ?? "");
  if (!password) {
    throw new Error("Password is required");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string) {
  await requireAdmin();

  const session = await auth();
  if (session?.user?.id === id) {
    throw new Error("You cannot delete your own account");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
}
