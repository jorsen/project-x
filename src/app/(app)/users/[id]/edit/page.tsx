import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateUserRole, resetUserPassword } from "../../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, employeeNumber: true, role: true },
  });
  if (!user) notFound();

  const updateRoleWithId = updateUserRole.bind(null, id);
  const resetPasswordWithId = resetUserPassword.bind(null, id);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit User" description={`${user.name} (Employee #${user.employeeNumber})`} />

      <div className="space-y-6">
        <form
          action={updateRoleWithId}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Change Role</h2>
          <Select
            name="role"
            label="Role"
            defaultValue={user.role}
            options={[
              { value: "ADMIN", label: "ADMIN" },
              { value: "EDITOR", label: "EDITOR" },
              { value: "VIEWER", label: "VIEWER" },
            ]}
          />
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <Button type="submit">Save Role</Button>
          </div>
        </form>

        <form
          action={resetPasswordWithId}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Reset Password</h2>
          <Field
            name="password"
            label="New Password"
            type="password"
            required
            description="Use at least 8 characters."
          />
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <Button type="submit">Reset Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
