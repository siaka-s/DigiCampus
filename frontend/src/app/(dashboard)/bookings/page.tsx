"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { bookingsApi, type Booking } from "@/lib/api/bookings"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, CalendarX, Search } from "lucide-react"

const statusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente",  className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",     className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",     className: "bg-digicampus-danger/10 text-digicampus-danger" },
  annulee:    { label: "Annulée",     className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

const STATUS_FILTERS = [
  { value: "all",        label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "validee",    label: "Validées" },
  { value: "refusee",    label: "Refusées" },
  { value: "annulee",    label: "Annulées" },
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState("all")

  async function load() {
    setLoading(true)
    const res = await bookingsApi.list()
    if (res.data) setBookings(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function cancel(id: string) {
    await bookingsApi.cancel(id)
    load()
  }

  const filtered = bookings
    .filter(b => filter === "all" || b.Status === filter)
    .filter(b => !search || b.Program.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Mes réservations</h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Historique et suivi de vos demandes de salle
          </p>
        </div>
        <Link href="/bookings/new">
          <Button className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle demande
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-digicampus-text-secondary" />
              <Input
                placeholder="Rechercher par programme…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-1 bg-digicampus-neutral rounded-xl p-1">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.value
                      ? "bg-white text-digicampus-text-primary shadow-sm"
                      : "text-digicampus-text-secondary hover:text-digicampus-text-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center">
                        <CalendarX className="w-6 h-6 text-digicampus-text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-digicampus-text-primary">
                          {search || filter !== "all" ? "Aucun résultat" : "Aucune réservation"}
                        </p>
                        <p className="text-xs text-digicampus-text-secondary mt-1">
                          {search || filter !== "all"
                            ? "Essayez d'ajuster vos filtres."
                            : "Vous n'avez pas encore fait de demande de salle."}
                        </p>
                      </div>
                      {!search && filter === "all" && (
                        <Link href="/bookings/new">
                          <Button size="sm" className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            Faire une demande
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(b => {
                  const s = statusConfig[b.Status] ?? { label: b.Status, className: "" }
                  const date = new Date(b.StartTime).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                  return (
                    <TableRow key={b.ID}>
                      <TableCell className="font-medium">
                        {b.Program}
                        {b.IsUrgent && <Badge className="ml-2 bg-digicampus-danger/10 text-digicampus-danger text-xs">Urgent</Badge>}
                      </TableCell>
                      <TableCell>{date}</TableCell>
                      <TableCell>{b.Duration} min</TableCell>
                      <TableCell>{b.Participants}</TableCell>
                      <TableCell><Badge className={s.className}>{s.label}</Badge></TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary max-w-xs truncate">
                        {b.Comment ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {b.Status === "en_attente" && (
                          <Button size="sm" variant="destructive" onClick={() => cancel(b.ID)}>
                            Annuler
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
