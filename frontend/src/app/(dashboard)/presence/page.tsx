"use client"

import { useEffect, useState, useCallback } from "react"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { presenceApi } from "@/lib/api/presence"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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

export default function PresencePage() {
  const [monday, setMonday]         = useState(getMonday(new Date()))
  const [bureaux, setBureaux]   = useState<Space[]>([])
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  const days = weekDays(monday)
  const weekStart = formatDate(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const [spacesRes, presenceRes] = await Promise.all([
      spacesApi.list(),
      presenceApi.getMyPresence(weekStart),
    ])
    const sharedBureaux = (spacesRes.data ?? []).filter(
      s => s.IsActive && s.Type === "bureau_partage"
    )
    setBureaux(sharedBureaux)
    const existing = presenceRes.data ?? []

    const sel: Record<string, string[]> = {}
    for (const b of sharedBureaux) {
      sel[b.ID] = existing
        .filter(p => p.SpaceID === b.ID)
        .map(p => p.Date.split("T")[0])
    }
    setSelected(sel)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  function toggleDay(spaceID: string, date: string) {
    setSelected(prev => {
      const current = prev[spaceID] ?? []
      return {
        ...prev,
        [spaceID]: current.includes(date)
          ? current.filter(d => d !== date)
          : [...current, date],
      }
    })
  }

  async function save() {
    setSaving(true)
    for (const [spaceID, dates] of Object.entries(selected)) {
      if (dates.length > 0) {
        await presenceApi.declare(spaceID, dates)
      }
    }
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">
          Ma présence
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
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : bureaux.length === 0 ? (
        <p className="text-sm text-digicampus-text-secondary py-8 text-center">
          Aucun bureau partagé disponible
        </p>
      ) : (
        <div className="space-y-4">
          {bureaux.map(bureau => (
            <Card key={bureau.ID}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {bureau.Name}
                  <span className="text-xs font-normal text-digicampus-text-secondary">
                    {bureau.Seats} places assises
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, i) => {
                    const dateStr = formatDate(day)
                    const isSelected = (selected[bureau.ID] ?? []).includes(dateStr)
                    const isPast = day < new Date(new Date().setHours(0,0,0,0))
                    return (
                      <button
                        key={dateStr}
                        disabled={isPast}
                        onClick={() => toggleDay(bureau.ID, dateStr)}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                          isPast
                            ? "opacity-40 cursor-not-allowed border-border"
                            : isSelected
                            ? "border-digicampus-primary bg-digicampus-primary/10"
                            : "border-border hover:border-digicampus-primary/50"
                        }`}
                      >
                        <span className="text-xs text-digicampus-text-secondary">{DAYS_FR[i]}</span>
                        <span className="text-sm font-medium">{day.getDate()}</span>
                        {isSelected && (
                          <Badge className="mt-1 text-xs bg-digicampus-primary/20 text-digicampus-primary p-0 px-1">✓</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={save}
            disabled={saving}
            className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer ma présence"}
          </Button>
        </div>
      )}
    </div>
  )
}
