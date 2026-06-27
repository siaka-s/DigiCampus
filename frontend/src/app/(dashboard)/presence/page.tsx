"use client"

import { useEffect, useState, useCallback } from "react"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { presenceApi } from "@/lib/api/presence"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react"
import { toast } from "sonner"

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
  const [monday, setMonday]     = useState(getMonday(new Date()))
  const [bureaux, setBureaux]   = useState<Space[]>([])
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const days      = weekDays(monday)
  const weekStart = formatDate(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const [spacesRes, presenceRes] = await Promise.all([
      spacesApi.list(),
      presenceApi.getMyPresence(weekStart),
    ])
    const sharedBureaux = (spacesRes.data ?? []).filter(
      s => s.is_active && s.type === "bureau_partage"
    )
    setBureaux(sharedBureaux)
    const existing = presenceRes.data ?? []

    const sel: Record<string, string[]> = {}
    for (const b of sharedBureaux) {
      sel[b.id] = existing
        .filter(p => p.SpaceID === b.id)
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
    let hasError = false
    for (const bureau of bureaux) {
      const dates = selected[bureau.id] ?? []
      const res = await presenceApi.declare(bureau.id, weekStart, dates)
      if (res.error) { hasError = true }
    }
    setSaving(false)
    if (hasError) {
      toast.error("Une erreur est survenue lors de l'enregistrement")
    } else {
      toast.success("Présence enregistrée")
    }
    load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Ma présence</h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Déclarez ou modifiez vos jours de présence au bureau
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
          {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : bureaux.length === 0 ? (
        <Card className="rounded-xl border border-border bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-digicampus-text-secondary" />
            </div>
            <p className="text-sm text-digicampus-text-secondary">Aucun bureau partagé disponible</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bureaux.map(bureau => {
            const selectedDays = selected[bureau.id] ?? []
            const occupancyPct = bureau.seats > 0 ? Math.round((selectedDays.length / bureau.seats) * 100) : 0
            const isOver = selectedDays.length > bureau.seats

            return (
              <Card key={bureau.id} className="rounded-xl border border-border bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-digicampus-text-primary">{bureau.name}</h2>
                      {selectedDays.length > 0 && (
                        <p className="text-xs text-digicampus-text-secondary mt-0.5">
                          {selectedDays.length} jour{selectedDays.length > 1 ? "s" : ""} sélectionné{selectedDays.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    {/* Seat count indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isOver ? "text-digicampus-danger" : "text-digicampus-text-primary"}`}>
                          {selectedDays.length} / {bureau.seats}
                        </p>
                        <p className="text-xs text-digicampus-text-secondary">places</p>
                      </div>
                      <div className="w-16 h-1.5 bg-digicampus-neutral rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? "bg-digicampus-danger" : "bg-digicampus-primary"}`}
                          style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                        />
                      </div>
                      {isOver && (
                        <Badge className="bg-digicampus-danger/10 text-digicampus-danger text-xs border-0">
                          Suroccupé
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day, i) => {
                      const dateStr    = formatDate(day)
                      const isSelected = selectedDays.includes(dateStr)
                      const isToday    = formatDate(new Date()) === dateStr
                      return (
                        <button
                          key={dateStr}
                          onClick={() => toggleDay(bureau.id, dateStr)}
                          className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all ${
                            isSelected
                              ? "border-digicampus-primary bg-digicampus-primary/10 shadow-sm"
                              : "border-border hover:border-digicampus-primary/40 hover:bg-digicampus-neutral"
                          }`}
                        >
                          <span className={`text-xs font-medium ${
                            isToday ? "text-digicampus-primary" : "text-digicampus-text-secondary"
                          }`}>
                            {DAYS_FR[i]}
                          </span>
                          <span className={`text-base font-semibold mt-0.5 ${
                            isSelected
                              ? "text-digicampus-primary"
                              : isToday
                              ? "text-digicampus-primary"
                              : "text-digicampus-text-primary"
                          }`}>
                            {day.getDate()}
                          </span>
                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full transition-colors ${
                            isSelected ? "bg-digicampus-primary" : "bg-transparent"
                          }`} />
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Button
            onClick={save}
            disabled={saving}
            className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer ma présence"}
          </Button>
        </div>
      )}
    </div>
  )
}
