import { auth } from "@/auth";
import { navSections } from "@/lib/nav";
import { AppShell } from "@/components/ui/AppShell";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const identity = session?.user?.name ?? session?.user?.employeeNumber ?? "?";

  return (
    <AppShell
      navSections={navSections}
      role={role}
      identity={identity}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  );
}
