import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopHeader } from "@/components/top-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const role  = session.user?.role ?? "partenaire"
  const email = session.user?.email ?? ""

  return (
    <div className="min-h-screen bg-digicampus-neutral flex">
      <SidebarNav role={role} email={email} />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 pt-14">
          <div className="max-w-screen-2xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
