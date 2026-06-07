import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const role  = session.user?.role ?? "collaborateur_partenaire"
  const email = session.user?.email ?? ""

  return (
    <div className="min-h-screen bg-digicampus-neutral flex">
      <SidebarNav role={role} email={email} />
      <main className="ml-60 flex-1 p-6 min-h-screen">
        {children}
      </main>
    </div>
  )
}
