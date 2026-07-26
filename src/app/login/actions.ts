"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const employeeNumber = String(formData.get("employeeNumber") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  try {
    await signIn("credentials", { employeeNumber, password, redirectTo: callbackUrl });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid employee number or password." };
    }
    throw error;
  }
}
