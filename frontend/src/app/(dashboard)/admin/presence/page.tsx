"use client"

import { useEffect, useState, useCallback } from "react"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { presenceApi, type Presence } from "@/lib/api/presence"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"

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
      s => s.IsActive && s.Type === "bureau_partage"
    )
    setBureaux(sharedBureaux)

    const presenceMap: Record<string, Presence[]> = {}
    await Promise.all(
      sharedBureaux.map(async b => {
        const res = await presenceApi.getBySpace(b.ID, weekStart)
        presenceMap[b.ID] = res.data ?? []
      })
    )
    setPresences(presenceMap)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  function countForDay(spaceID: string, date: string): number {
    return (presences[spaceID] ?? []).filter(p => p.Date.startsWith(date)).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">
          Présences par bureau
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() - 7); return n })}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-52 text-center">{displayWeek(monday)}</span>
          <Button variant="outline" size="sm" onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() + 7); return n })}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : bureaux.length === 0 ? (
        <p className="text-sm text-digicampus-text-secondary py-8 text-center">
          Aucun bureau partagé actif
        </p>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-digicampus-text-secondary font-medium w-40">Bureau</th>
                <th className="px-4 py-3 text-digicampus-text-secondary font-medium text-center">Places</th>
                {days.map((day, i) => (
                  <th key={formatDate(day)} className="px-3 py-3 text-digicampus-text-secondary font-normal text-center min-w-20">
                    <div>{DAYS_FR[i]}</div>
                    <div className="text-xs">{day.getDate()}/{day.getMonth()+1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bureaux.map(bureau => (
                <tr key={bureau.ID} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-digicampus-text-primary">{bureau.Name}</td>
                  <td className="px-4 py-3 text-center text-digicampus-text-secondary">{bureau.Seats}</td>
                  {days.map(day => {
                    const dateStr = formatDate(day)
                    const count = countForDay(bureau.ID, dateStr)
                    const isOver = count > bureau.Seats && bureau.Seats > 0
                    const isFull = count === bureau.Seats && bureau.Seats > 0
                    return (
                      <td key={dateStr} className="px-3 py-3 text-center">
                        {count > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              className={
                                isOver
                                  ? "bg-digicampus-danger/10 text-digicampus-danger"
                                  : isFull
                                  ? "bg-digicampus-warning/10 text-digicampus-warning"
                                  : "bg-digicampus-success/10 text-digicampus-success"
                              }
                            >
                              {count}
                            </Badge>
                            {isOver && <AlertTriangle className="w-3 h-3 text-digicampus-danger" />}
                          </div>
                        ) : (
                          <span className="text-digicampus-text-secondary text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
