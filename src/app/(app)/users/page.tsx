import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { RoleBadge } from "@/components/ui/Badge";
import * as t from "@/components/ui/table";
import { deleteUser } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const { flash } = await searchParams;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, employeeNumber: true, role: true, createdAt: true },
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} user${users.length === 1 ? "" : "s"} total`}
        actions={<LinkButton href="/users/new">+ New user</LinkButton>}
      />

      <FlashBanner message={flash} />

      <div className={t.tableWrap}>
        <table className={t.table}>
          <thead className={t.thead}>
            <tr>
              <th className={t.th}>Name</th>
              <th className={t.th}>Employee #</th>
              <th className={t.th}>Role</th>
              <th className={t.th}>Created At</th>
              <th className={t.th} />
            </tr>
          </thead>
          <tbody className={t.tbody}>
            {users.map((u) => (
              <tr key={u.id} className={t.tr}>
                <td className={`${t.td} font-medium text-slate-900`}>{u.name}</td>
                <td className={t.td}>{u.employeeNumber}</td>
                <td className={t.td}>
                  <RoleBadge role={u.role} />
                </td>
                <td className={t.td}>{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className={t.tdActions}>
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/users/${u.id}/edit`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    {session.user.id !== u.id && (
                      <DeleteButton
                        action={deleteUser.bind(null, u.id)}
                        confirmText={`Delete user "${u.name}"? This cannot be undone.`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
