"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { occupancyApi, type OccupancyItem } from "@/lib/api/occupancy"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, Users, Monitor } from "lucide-react"

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function displayWeek(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
}

function dayStatus(space: OccupancyItem): "libre" | "en_attente" | "occupee" | "suroccupee" {
  if (space.type === "bureau_partage" && space.is_over_capacity) return "suroccupee"
  if (!space.bookings?.length) return "libre"
  if (space.bookings.some(b => b.status === "validee")) return "occupee"
  return "en_attente"
}

const statusStyle: Record<string, string> = {
  libre:      "bg-digicampus-success/15 text-digicampus-success border-digicampus-success/30",
  en_attente: "bg-digicampus-secondary/15 text-digicampus-secondary border-digicampus-secondary/30",
  occupee:    "bg-digicampus-primary/15 text-digicampus-primary border-digicampus-primary/30",
  suroccupee: "bg-digicampus-danger/15 text-digicampus-danger border-digicampus-danger/30",
}

const statusLabel: Record<string, string> = {
  libre: "", en_attente: "~", occupee: "●", suroccupee: "!",
}

export default function DashboardPage() {
  const router = useRouter()
  const [monday, setMonday]       = useState(getMonday(new Date()))
  const [weekData, setWeekData]   = useState<OccupancyItem[][]>([])
  const [loading, setLoading]     = useState(true)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  const load = useCallback(async () => {
    setLoading(true)
    const data = await occupancyApi.getWeek(formatDate(monday))
    setWeekData(data)
    setLoading(false)
  }, [monday])

  useEffect(() => { load() }, [load])

  // Toutes les salles actives (union des 7 jours)
  const allSpaces = weekData[0] ?? []
  const salles  = allSpaces.filter(s => s.type === "salle_programme")
  const bureaux = allSpaces.filter(s => s.type === "bureau_partage" || s.type === "bureau_individuel")

  // Taux d'occupation hebdo
  const totalCells    = salles.length * 7
  const occupiedCells = weekData.reduce((acc, dayItems) =>
    acc + dayItems.filter(s => s.type === "salle_programme" && s.bookings?.some(b => b.status === "validee")).length, 0)
  const rate = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">Vue du campus</h1>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() - 7); return n })}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-52 text-center">{displayWeek(monday)}</span>
          <Button variant="outline" size="sm" onClick={() => setMonday(m => { const n = new Date(m); n.setDate(n.getDate() + 7); return n })}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-digicampus-text-secondary">Taux d&apos;occupation</span>
          <Badge className={
            rate >= 80 ? "bg-digicampus-danger/10 text-digicampus-danger"
            : rate >= 50 ? "bg-digicampus-warning/10 text-digicampus-warning"
            : "bg-digicampus-success/10 text-digicampus-success"
          }>{rate}%</Badge>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs text-digicampus-text-secondary">
        {[
          { key: "libre",      label: "Libre" },
          { key: "en_attente", label: "En attente" },
          { key: "occupee",    label: "Occupé" },
          { key: "suroccupee", label: "Suroccupé" },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded border ${statusStyle[key]}`} />
            {label}
          </span>
        ))}
      </div>

      <Separator />

      {/* Grille hebdomadaire — Salles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-digicampus-text-secondary uppercase tracking-wide flex items-center gap-2">
          <Monitor className="w-4 h-4" /> Salles de programme
        </h2>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : salles.length === 0 ? (
          <p className="text-sm text-digicampus-text-secondary py-4">Aucune salle de programme active</p>
        ) : (
          <div className="bg-white rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-digicampus-text-secondary font-medium w-40">Salle</th>
                  {days.map((day, i) => {
                    const isToday = formatDate(day) === formatDate(new Date())
                    return (
                      <th key={formatDate(day)} className={`px-2 py-3 text-center min-w-20 ${isToday ? "bg-digicampus-primary/5" : ""}`}>
                        <div className={`text-xs font-medium ${isToday ? "text-digicampus-primary" : "text-digicampus-text-secondary"}`}>{DAYS_FR[i]}</div>
                        <div className={`text-sm ${isToday ? "text-digicampus-primary font-semibold" : "text-digicampus-text-primary"}`}>
                          {day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {salles.map(space => (
                  <tr key={space.id} className="border-b border-border last:border-0 hover:bg-digicampus-neutral/30 transition-colors">
                    <td className="px-4 py-2 font-medium text-digicampus-text-primary text-sm">{space.name}</td>
                    {days.map((day, i) => {
                      const dayItems = weekData[i] ?? []
                      const s = dayItems.find(d => d.id === space.id)
                      const status = s ? dayStatus(s) : "libre"
                      const count  = s?.bookings?.length ?? 0
                      return (
                        <td key={formatDate(day)} className="px-2 py-2 text-center">
                          <button
                            onClick={() => router.push(`/dashboard/spaces/${space.id}?date=${formatDate(day)}`)}
                            className={`w-full rounded border py-1.5 text-xs font-medium transition-all hover:opacity-80 ${statusStyle[status]}`}
                          >
                            {statusLabel[status]}
                            {count > 0 && <span className="ml-1 text-[10px] opacity-70">{count}</span>}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Separator />

      {/* Bureaux */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-digicampus-text-secondary uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4" /> Bureaux
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : bureaux.length === 0 ? (
          <p className="text-sm text-digicampus-text-secondary py-4">Aucun bureau actif</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bureaux.map(b => {
              // Prendre les données du jour courant (aujourd'hui ou lundi si hors semaine)
              const todayIdx = days.findIndex(d => formatDate(d) === formatDate(new Date()))
              const idx = todayIdx >= 0 ? todayIdx : 0
              const todayData = (weekData[idx] ?? []).find(s => s.id === b.id) ?? b
              const isOver = todayData.is_over_capacity
              const isFull = todayData.seats > 0 && todayData.presence_count >= todayData.seats

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-sm transition-shadow ${
                    isOver ? "border-digicampus-danger" : isFull ? "border-digicampus-warning" : "border-border"
                  }`}
                  onClick={() => router.push(`/dashboard/spaces/${b.id}`)}
                >
                  <p className="font-medium text-digicampus-text-primary text-sm truncate">{b.name}</p>
                  <p className="text-xs text-digicampus-text-secondary mt-1">
                    {b.type === "bureau_partage" ? "Bureau partagé" : "Bureau individuel"}
                  </p>
                  {b.type === "bureau_partage" && b.seats > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-digicampus-text-secondary">
                        {todayData.presence_count}/{todayData.seats} présents
                      </span>
                      <Badge className={
                        isOver ? "bg-digicampus-danger/10 text-digicampus-danger text-xs"
                        : isFull ? "bg-digicampus-warning/10 text-digicampus-warning text-xs"
                        : "bg-digicampus-success/10 text-digicampus-success text-xs"
                      }>
                        {isOver ? "Suroccupé" : isFull ? "Complet" : "Disponible"}
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
