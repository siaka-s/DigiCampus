"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Users, Building2, Calendar, CalendarPlus,
  UserCheck, Monitor, ClipboardList, Package, LogOut, Image as ImageIcon,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV: Record<string, NavItem[]> = {
  super_admin: [
    { href: "/dashboard",                   label: "Tableau de bord",    icon: LayoutDashboard },
    { href: "/admin/users",                  label: "Utilisateurs",       icon: Users },
    { href: "/admin/spaces",                 label: "Espaces",            icon: Building2 },
    { href: "/admin/bookings",               label: "Réservations",       icon: Calendar },
    { href: "/admin/bookings/direct",        label: "Affectation directe",icon: CalendarPlus },
    { href: "/admin/presence",               label: "Présence staff",     icon: UserCheck },
    { href: "/admin/equipment",              label: "Parc IT",            icon: Monitor },
    { href: "/admin/equipment/requests",     label: "Demandes IT",        icon: ClipboardList },
    { href: "/admin/photos",                 label: "Photos campus",      icon: ImageIcon },
  ],
  admin: [
    { href: "/dashboard",                   label: "Tableau de bord",    icon: LayoutDashboard },
    { href: "/admin/spaces",                 label: "Espaces",            icon: Building2 },
    { href: "/admin/bookings",               label: "Réservations",       icon: Calendar },
    { href: "/admin/bookings/direct",        label: "Affectation directe",icon: CalendarPlus },
    { href: "/admin/presence",               label: "Présence staff",     icon: UserCheck },
    { href: "/admin/equipment",              label: "Parc IT",            icon: Monitor },
    { href: "/admin/equipment/requests",     label: "Demandes IT",        icon: ClipboardList },
    { href: "/admin/photos",                 label: "Photos campus",      icon: ImageIcon },
  ],
  admin_it: [
    { href: "/dashboard",                   label: "Tableau de bord",    icon: LayoutDashboard },
    { href: "/admin/equipment",              label: "Parc IT",            icon: Monitor },
    { href: "/admin/equipment/requests",     label: "Demandes IT",        icon: ClipboardList },
  ],
  collaborateur_digifemmes: [
    { href: "/dashboard",                   label: "Tableau de bord",    icon: LayoutDashboard },
    { href: "/bookings",                     label: "Mes réservations",   icon: Calendar },
    { href: "/bookings/new",                 label: "Nouvelle demande",   icon: CalendarPlus },
    { href: "/presence",                     label: "Ma présence",        icon: UserCheck },
    { href: "/equipment/request",            label: "Demande matériel",   icon: Monitor },
    { href: "/equipment/rental",             label: "Location externe",   icon: Package },
  ],
  collaborateur_partenaire: [
    { href: "/dashboard",                   label: "Tableau de bord",    icon: LayoutDashboard },
    { href: "/bookings",                     label: "Mes réservations",   icon: Calendar },
    { href: "/bookings/new",                 label: "Nouvelle demande",   icon: CalendarPlus },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:              "Super Admin",
  admin:                    "Admin",
  admin_it:                 "Admin IT",
  collaborateur_digifemmes: "Collaborateur",
  collaborateur_partenaire: "Partenaire",
}

export function SidebarNav({ role, email }: { role: string; email: string }) {
  const pathname = usePathname()
  const items = NAV[role] ?? NAV.collaborateur_partenaire

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <p className="font-bold text-digicampus-text-primary text-lg">DigiCampus</p>
        <p className="text-xs text-digicampus-text-secondary mt-0.5">DigiFemmes Côte d&apos;Ivoire</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-digicampus-primary/10 text-digicampus-primary font-medium"
                  : "text-digicampus-text-secondary hover:bg-digicampus-neutral hover:text-digicampus-text-primary"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Pied — utilisateur */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        <div>
          <p className="text-xs font-medium text-digicampus-text-primary truncate">{email}</p>
          <p className="text-xs text-digicampus-text-secondary">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-xs text-digicampus-text-secondary hover:text-digicampus-danger transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
