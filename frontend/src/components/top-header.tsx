"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, Check, CheckCheck } from "lucide-react"
import { notificationsApi, type Notification } from "@/lib/api/notifications"

const TYPE_ICONS: Record<string, string> = {
  booking_validated:  "✅",
  booking_refused:    "❌",
  equipment_validated:"✅",
  equipment_refused:  "❌",
  account_activated:  "🎉",
}

export function TopHeader() {
  const { data: session } = useSession()
  const name     = session?.user?.name ?? session?.user?.email ?? ""
  const initials = name.split(/[\s@]/).filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen]                   = useState(false)
  const dropdownRef                       = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.IsRead).length

  async function fetchNotifications() {
    const res = await notificationsApi.list()
    if (res.data) setNotifications(res.data)
  }

  useEffect(() => {
    if (!session) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [session])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function markRead(id: string) {
    await notificationsApi.markRead(id)
    setNotifications(prev => prev.map(n => n.ID === id ? { ...n, IsRead: true } : n))
  }

  async function markAllRead() {
    await notificationsApi.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    })
  }

  return (
    <header className="fixed left-60 right-0 top-0 h-14 bg-white border-b border-border z-10 flex items-center px-6">
      <div className="flex items-center gap-2 ml-auto" ref={dropdownRef}>

        {/* Bell button */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-digicampus-neutral text-digicampus-text-secondary transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-digicampus-danger text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-digicampus-text-primary">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-digicampus-danger text-white text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-digicampus-secondary hover:text-digicampus-secondary-dark transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout marquer lu
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-digicampus-text-secondary mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-digicampus-text-secondary">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.ID}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                        n.IsRead ? "bg-white" : "bg-digicampus-primary/5"
                      }`}
                    >
                      <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[n.Type] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${n.IsRead ? "text-digicampus-text-secondary" : "text-digicampus-text-primary font-medium"}`}>
                          {n.Message}
                        </p>
                        <p className="text-[11px] text-digicampus-text-secondary mt-1">{formatDate(n.CreatedAt)}</p>
                      </div>
                      {!n.IsRead && (
                        <button
                          onClick={() => markRead(n.ID)}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-digicampus-neutral text-digicampus-text-secondary hover:text-digicampus-text-primary transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-digicampus-primary flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold leading-none">{initials || "?"}</span>
        </div>
      </div>
    </header>
  )
}
