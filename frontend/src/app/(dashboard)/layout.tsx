import { auth, signOut } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-digicampus-neutral">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-digicampus-text-primary">DigiCampus</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-digicampus-text-secondary">
            {session.user?.email}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
