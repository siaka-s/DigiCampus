"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Users, Building2, Calendar, CalendarPlus,
  UserCheck, Monitor, ClipboardList, Package, LogOut,
  Image as ImageIcon, Layers, Megaphone,
} from "lucide-react"

type NavItem    = { href: string; label: string; icon: React.ElementType }
type NavSection = { label?: string; items: NavItem[] }

const NAV: Record<string, NavSection[]> = {
  super_admin: [
    { items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "ESPACE",
      items: [
        { href: "/admin/spaces",          label: "Espaces",             icon: Building2 },
        { href: "/admin/bookings",        label: "Réservations",        icon: Calendar },
        { href: "/admin/bookings/direct", label: "Affectation directe", icon: CalendarPlus },
        { href: "/admin/presence",        label: "Présence staff",      icon: UserCheck },
      ],
    },
    {
      label: "MATÉRIEL IT",
      items: [
        { href: "/admin/equipment",          label: "Parc IT",      icon: Monitor },
        { href: "/admin/equipment/requests", label: "Demandes IT",  icon: ClipboardList },
      ],
    },
    {
      label: "CAMPUS",
      items: [
        { href: "/admin/events", label: "Événements", icon: Megaphone },
      ],
    },
    {
      label: "ADMINISTRATION",
      items: [
        { href: "/admin/users",       label: "Utilisateurs",  icon: Users },
        { href: "/admin/departments", label: "Départements",  icon: Layers },
        { href: "/admin/photos",      label: "Photos campus", icon: ImageIcon },
      ],
    },
  ],

  admin: [
    { items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "ESPACE",
      items: [
        { href: "/admin/spaces",          label: "Espaces",             icon: Building2 },
        { href: "/admin/bookings",        label: "Réservations",        icon: Calendar },
        { href: "/admin/bookings/direct", label: "Affectation directe", icon: CalendarPlus },
        { href: "/admin/presence",        label: "Présence staff",      icon: UserCheck },
      ],
    },
    {
      label: "MATÉRIEL IT",
      items: [
        { href: "/admin/equipment",          label: "Parc IT",     icon: Monitor },
        { href: "/admin/equipment/requests", label: "Demandes IT", icon: ClipboardList },
      ],
    },
    {
      label: "CAMPUS",
      items: [
        { href: "/admin/events", label: "Événements", icon: Megaphone },
      ],
    },
    {
      label: "CONFIGURATION",
      items: [
        { href: "/admin/departments", label: "Départements",  icon: Layers },
        { href: "/admin/photos",      label: "Photos campus", icon: ImageIcon },
      ],
    },
  ],

  collaborateur: [
    { items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "RÉSERVATIONS",
      items: [
        { href: "/bookings",     label: "Mes réservations", icon: Calendar },
        { href: "/bookings/new", label: "Nouvelle demande", icon: CalendarPlus },
      ],
    },
    {
      label: "PRÉSENCE",
      items: [
        { href: "/presence", label: "Ma présence", icon: UserCheck },
      ],
    },
    {
      label: "MATÉRIEL IT",
      items: [
        { href: "/equipment/my-requests", label: "Mes demandes IT",  icon: ClipboardList },
        { href: "/equipment/request",     label: "Mission interne",  icon: Monitor },
        { href: "/equipment/rental",      label: "Location externe", icon: Package },
      ],
    },
    {
      label: "CAMPUS",
      items: [
        { href: "/events", label: "Événements", icon: Megaphone },
      ],
    },
  ],

  partenaire: [
    { items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      label: "RÉSERVATIONS",
      items: [
        { href: "/bookings",     label: "Mes réservations", icon: Calendar },
        { href: "/bookings/new", label: "Nouvelle demande", icon: CalendarPlus },
      ],
    },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:   "Super Admin",
  admin:         "Admin",
  collaborateur: "Collaborateur",
  partenaire:    "Partenaire",
}

export function SidebarNav({ role, email }: { role: string; email: string }) {
  const pathname = usePathname()
  const sections = NAV[role] ?? NAV.partenaire

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 h-14 border-b border-border flex items-center justify-center shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-digifemmes.png"
          alt="DigiFemmes Côte d'Ivoire"
          style={{ width: 148, height: "auto" }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-digicampus-text-secondary uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon     = item.icon
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
            </div>
          </div>
        ))}
      </nav>

      {/* Footer utilisateur */}
      <div className="px-4 py-4 border-t border-border space-y-2 shrink-0">
        <div>
          <p className="text-xs font-medium text-digicampus-text-primary truncate">{email}</p>
          <p className="text-[11px] text-digicampus-text-secondary">{ROLE_LABELS[role] ?? role}</p>
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
