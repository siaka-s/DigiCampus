"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { occupancyApi, type OccupancyItem } from "@/lib/api/occupancy"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, Users, Monitor } from "lucide-react"

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8h à 20h

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function displayDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function slotStatus(space: OccupancyItem, hour: number): "libre" | "en_attente" | "occupee" {
  if (!space.bookings?.length) return "libre"
  for (const b of space.bookings) {
    const start = new Date(b.start_time)
    const end = new Date(start.getTime() + b.duration * 60000)
    if (hour >= start.getHours() && hour < end.getHours()) {
      return b.status === "validee" ? "occupee" : "en_attente"
    }
  }
  return "libre"
}

const slotColors: Record<string, string> = {
  libre:      "bg-digicampus-success/20 text-digicampus-success",
  en_attente: "bg-digicampus-secondary/20 text-digicampus-secondary",
  occupee:    "bg-digicampus-primary/20 text-digicampus-primary",
}

export default function DashboardPage() {
  const router = useRouter()
  const [date, setDate]       = useState(new Date())
  const [items, setItems]     = useState<OccupancyItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: Date) => {
    setLoading(true)
    const res = await occupancyApi.get(formatDate(d))
    if (res.data) setItems(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  function prevDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  const salles  = items.filter(i => i.type === "salle_programme")
  const bureaux = items.filter(i => i.type === "bureau_partage" || i.type === "bureau_individuel")

  const totalSlots   = salles.length * HOURS.length
  const occupiedSlots = salles.reduce((acc, s) =>
    acc + HOURS.filter(h => slotStatus(s, h) === "occupee").length, 0)
  const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0

  return (
    <div className="space-y-6">
      {/* En-tête + navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">
          Vue du campus
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-digicampus-text-primary capitalize min-w-56 text-center">
            {displayDate(date)}
          </span>
          <Button variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-digicampus-text-secondary">Taux d&apos;occupation</span>
          <Badge
            className={
              occupancyRate >= 80
                ? "bg-digicampus-danger/10 text-digicampus-danger"
                : occupancyRate >= 50
                ? "bg-digicampus-warning/10 text-digicampus-warning"
                : "bg-digicampus-success/10 text-digicampus-success"
            }
          >
            {occupancyRate}%
          </Badge>
        </div>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-xs text-digicampus-text-secondary">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-digicampus-success/40 inline-block" /> Libre</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-digicampus-secondary/40 inline-block" /> En attente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-digicampus-primary/40 inline-block" /> Occupé</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-digicampus-danger/40 inline-block" /> Suroccupé</span>
      </div>

      <Separator />

      {/* Grille des salles de programme */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-digicampus-text-secondary uppercase tracking-wide flex items-center gap-2">
          <Monitor className="w-4 h-4" /> Salles de programme
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : salles.length === 0 ? (
          <p className="text-sm text-digicampus-text-secondary py-4">Aucune salle de programme active</p>
        ) : (
          <div className="bg-white rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-digicampus-text-secondary font-medium w-40">Salle</th>
                  {HOURS.map(h => (
                    <th key={h} className="px-1 py-2 text-digicampus-text-secondary font-normal text-center min-w-[48px]">
                      {h}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salles.map(s => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-digicampus-neutral/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/spaces/${s.id}`)}
                  >
                    <td className="px-4 py-2 font-medium text-digicampus-text-primary">{s.name}</td>
                    {HOURS.map(h => {
                      const status = slotStatus(s, h)
                      return (
                        <td key={h} className="px-1 py-2 text-center">
                          <div className={`mx-auto w-9 h-7 rounded text-xs flex items-center justify-center ${slotColors[status]}`}>
                            {status === "en_attente" ? "~" : status === "occupee" ? "●" : ""}
                          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : bureaux.length === 0 ? (
          <p className="text-sm text-digicampus-text-secondary py-4">Aucun bureau actif</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bureaux.map(b => {
              const isOver = b.is_over_capacity
              const isFull = b.seats > 0 && b.presence_count >= b.seats
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
                        {b.presence_count}/{b.seats} présents
                      </span>
                      <Badge
                        className={
                          isOver
                            ? "bg-digicampus-danger/10 text-digicampus-danger text-xs"
                            : isFull
                            ? "bg-digicampus-warning/10 text-digicampus-warning text-xs"
                            : "bg-digicampus-success/10 text-digicampus-success text-xs"
                        }
                      >
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
