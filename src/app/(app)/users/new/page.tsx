import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New User" />
      <form
        action={createUser}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field name="name" label="Name" required />
        <Field name="employeeNumber" label="Employee Number" required />
        <Field
          name="password"
          label="Password"
          type="password"
          required
          description="Use at least 8 characters."
        />
        <Select
          name="role"
          label="Role"
          defaultValue="VIEWER"
          options={[
            { value: "ADMIN", label: "ADMIN" },
            { value: "EDITOR", label: "EDITOR" },
            { value: "VIEWER", label: "VIEWER" },
          ]}
        />
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/users" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
