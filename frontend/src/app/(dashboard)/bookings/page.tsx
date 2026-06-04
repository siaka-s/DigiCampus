"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { bookingsApi, type Booking } from "@/lib/api/bookings"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"

const statusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente",  className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",     className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",     className: "bg-digicampus-danger/10 text-digicampus-danger" },
  annulee:    { label: "Annulée",     className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">Mes réservations</h1>
        <Link href="/bookings/new">
          <Button className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle demande
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
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
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-digicampus-text-secondary">
                    Aucune réservation — <Link href="/bookings/new" className="text-digicampus-primary hover:underline">Faire une demande</Link>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map(b => {
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
