"use client"

import { useEffect, useState, useCallback } from "react"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { presenceApi, type Presence } from "@/lib/api/presence"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, AlertTriangle, Users } from "lucide-react"

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function displayWeek(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
}

export default function AdminPresencePage() {
  const [monday, setMonday]       = useState(getMonday(new Date()))
  const [bureaux, setBureaux]     = useState<Space[]>([])
  const [presences, setPresences] = useState<Record<string, Presence[]>>({})
  const [loading, setLoading]     = useState(true)

  const days = weekDays(monday)
  const weekStart = formatDate(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const spacesRes = await spacesApi.list()
    const sharedBureaux = (spacesRes.data ?? []).filter(
      s => s.is_active && s.type === "bureau_partage"
    )
    setBureaux(sharedBureaux)

    const presenceMap: Record<string, Presence[]> = {}
    await Promise.all(
      sharedBureaux.map(async b => {
        const res = await presenceApi.getBySpace(b.id, weekStart)
        presenceMap[b.id] = res.data ?? []
      })
    )
    setPresences(presenceMap)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  function countForDay(spaceID: string, date: string): number {
    return (presences[spaceID] ?? []).filter(p => p.Date.startsWith(date)).length
  }

  function usersForDay(spaceID: string, date: string): Presence[] {
    return (presences[spaceID] ?? []).filter(p => p.Date.startsWith(date))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">
            Présences par bureau
          </h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Présences déclarées par bureau pour la semaine sélectionnée
          </p>
        </div>

        {/* Week navigation — pill style */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl shadow-sm px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() - 7); return n })}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-52 text-center text-digicampus-text-primary">
            {displayWeek(monday)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() + 7); return n })}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : bureaux.length === 0 ? (
        <div className="rounded-xl border border-border bg-white shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-digicampus-text-secondary" />
          </div>
          <p className="text-sm text-digicampus-text-secondary">Aucun bureau partagé actif</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bureaux.map(bureau => {
            const totalPresents = Math.max(...days.map(d => countForDay(bureau.id, formatDate(d))), 0)
            const peakCount     = days.reduce((max, d) => Math.max(max, countForDay(bureau.id, formatDate(d))), 0)
            const isOver        = peakCount > bureau.seats && bureau.seats > 0
            const occupancyPct  = bureau.seats > 0 ? Math.round((peakCount / bureau.seats) * 100) : 0

            return (
              <div key={bureau.id} className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                {/* Bureau header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
                  <div>
                    <h2 className="text-base font-semibold text-digicampus-text-primary">{bureau.name}</h2>
                    <p className="text-xs text-digicampus-text-secondary mt-0.5">
                      {bureau.seats} place{bureau.seats > 1 ? "s" : ""} assise{bureau.seats > 1 ? "s" : ""}
                    </p>
                  </div>
                  {/* Seat count indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isOver ? "text-digicampus-danger" : "text-digicampus-text-primary"}`}>
                        {peakCount} / {bureau.seats}
                      </p>
                      <p className="text-xs text-digicampus-text-secondary">max cette semaine</p>
                    </div>
                    <div className="w-20 h-1.5 bg-digicampus-neutral rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? "bg-digicampus-danger" : "bg-digicampus-primary"}`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>
                    {isOver && (
                      <Badge className="bg-digicampus-danger/10 text-digicampus-danger text-xs border-0">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Suroccupé
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-px bg-border">
                  {days.map((day, i) => {
                    const dateStr  = formatDate(day)
                    const count    = countForDay(bureau.id, dateStr)
                    const users    = usersForDay(bureau.id, dateStr)
                    const dayOver  = count > bureau.seats && bureau.seats > 0
                    const dayFull  = count === bureau.seats && bureau.seats > 0
                    const isToday  = formatDate(new Date()) === dateStr

                    return (
                      <div key={dateStr} className="bg-white px-2 py-3 flex flex-col items-center gap-1.5 min-h-24">
                        {/* Day label */}
                        <div className="text-center">
                          <p className={`text-xs font-medium ${isToday ? "text-digicampus-primary" : "text-digicampus-text-secondary"}`}>
                            {DAYS_FR[i]}
                          </p>
                          <p className={`text-sm font-semibold mt-0.5 ${isToday ? "text-digicampus-primary" : "text-digicampus-text-primary"}`}>
                            {day.getDate()}/{day.getMonth() + 1}
                          </p>
                        </div>

                        {/* Count badge */}
                        {count > 0 ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <Badge
                              className={`text-xs font-semibold border-0 ${
                                dayOver
                                  ? "bg-digicampus-danger/10 text-digicampus-danger"
                                  : dayFull
                                  ? "bg-digicampus-warning/10 text-digicampus-warning"
                                  : "bg-digicampus-success/10 text-digicampus-success"
                              }`}
                            >
                              {count} présent{count > 1 ? "s" : ""}
                            </Badge>
                            {/* Colored dots per user */}
                            <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                              {users.slice(0, 6).map((p, idx) => (
                                <div
                                  key={p.ID ?? idx}
                                  title={p.UserName ?? "Collaborateur"}
                                  className={`w-2 h-2 rounded-full ${
                                    dayOver ? "bg-digicampus-danger" : "bg-digicampus-primary"
                                  }`}
                                />
                              ))}
                              {users.length > 6 && (
                                <span className="text-xs text-digicampus-text-secondary">+{users.length - 6}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-digicampus-text-secondary text-xs">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
