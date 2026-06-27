"use client"

import { useEffect, useState } from "react"
import { bookingsApi, type Booking } from "@/lib/api/bookings"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { StatCard } from "@/components/stat-card"

const statusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente",  className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",     className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",     className: "bg-digicampus-danger/10 text-digicampus-danger" },
  annulee:    { label: "Annulée",     className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

export default function AdminBookingsPage() {
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [loading, setLoading]           = useState(true)
  const [refusing, setRefusing]         = useState<Booking | null>(null)
  const [comment, setComment]           = useState("")
  const [saving, setSaving]             = useState(false)
  const [filterStatus, setFilterStatus] = useState("en_attente")

  async function load() {
    setLoading(true)
    const res = await bookingsApi.list()
    if (res.data) setBookings(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function validate(id: string) {
    const res = await bookingsApi.validate(id)
    if (res.error) { toast.error(res.error); return }
    toast.success("Réservation validée")
    load()
  }

  async function submitRefuse() {
    if (!refusing) return
    setSaving(true)
    const res = await bookingsApi.refuse(refusing.ID, comment)
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Demande refusée")
    setRefusing(null)
    setComment("")
    load()
  }

  const filtered = filterStatus === "all"
    ? bookings
    : bookings.filter(b => b.Status === filterStatus)

  const countPending  = bookings.filter(b => b.Status === "en_attente").length
  const countValidee  = bookings.filter(b => b.Status === "validee").length
  const countRefusee  = bookings.filter(b => b.Status === "refusee").length
  const countUrgent   = bookings.filter(b => b.IsUrgent).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">
          Demandes de réservation
        </h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Gérez et validez les demandes de réservation de salle
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="En attente"
          value={countPending}
          icon={Clock}
          trendLabel="À traiter"
          trend="neutral"
        />
        <StatCard
          label="Validées"
          value={countValidee}
          icon={CheckCircle}
          iconColor="text-digicampus-success"
          trendLabel="Confirmées"
          trend="up"
        />
        <StatCard
          label="Refusées"
          value={countRefusee}
          icon={XCircle}
          iconColor="text-digicampus-danger"
          trendLabel="Refusées"
          trend="neutral"
        />
        <StatCard
          label="Urgentes"
          value={countUrgent}
          icon={AlertTriangle}
          iconColor="text-digicampus-danger"
          trendLabel="Prioritaires"
          trend="neutral"
        />
      </div>

      {/* Table card */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <p className="text-sm font-medium text-digicampus-text-secondary">
              {filtered.length} demande{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              {(["en_attente", "validee", "refusee", "all"] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={filterStatus === s ? "default" : "outline"}
                  className={filterStatus === s ? "bg-digicampus-primary text-white hover:bg-digicampus-primary-dark" : ""}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Toutes" : statusConfig[s]?.label ?? s}
                </Button>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-digicampus-text-secondary">
                    Aucune demande dans cette catégorie
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
                        {b.IsUrgent && (
                          <Badge className="ml-2 bg-digicampus-danger/10 text-digicampus-danger text-xs">
                            Urgent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">{date}</TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">{b.Duration} min</TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">{b.Participants}</TableCell>
                      <TableCell>
                        <Badge className={s.className}>{s.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.Status === "en_attente" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-digicampus-success hover:bg-digicampus-success/90 text-white"
                              onClick={() => validate(b.ID)}
                            >
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setRefusing(b); setComment("") }}
                            >
                              Refuser
                            </Button>
                          </div>
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

      {/* Dialog refus */}
      <Dialog open={!!refusing} onOpenChange={open => !open && setRefusing(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Motif de refus</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Commentaire (obligatoire)</Label>
            <Input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Expliquez le motif du refus…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusing(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={submitRefuse}
              disabled={!comment.trim() || saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
