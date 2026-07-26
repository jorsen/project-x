import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteUser } from "./actions";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} user(s)</p>
        </div>
        <Link
          href="/users/new"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New user
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Created At</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/users/${u.id}/edit`}
                    className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Edit
                  </Link>
                  {session.user.id !== u.id && (
                    <DeleteButton
                      action={deleteUser.bind(null, u.id)}
                      confirmText={`Delete user "${u.name}"? This cannot be undone.`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
