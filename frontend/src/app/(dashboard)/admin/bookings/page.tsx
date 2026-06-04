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
import { Loader2 } from "lucide-react"

const statusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente",  className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",     className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",     className: "bg-digicampus-danger/10 text-digicampus-danger" },
  annulee:    { label: "Annulée",     className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

export default function AdminBookingsPage() {
  const [bookings, setBookings]     = useState<Booking[]>([])
  const [loading, setLoading]       = useState(true)
  const [refusing, setRefusing]     = useState<Booking | null>(null)
  const [comment, setComment]       = useState("")
  const [saving, setSaving]         = useState(false)
  const [filterStatus, setFilterStatus] = useState("en_attente")

  async function load() {
    setLoading(true)
    const res = await bookingsApi.list()
    if (res.data) setBookings(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function validate(id: string) {
    await bookingsApi.validate(id)
    load()
  }

  async function submitRefuse() {
    if (!refusing) return
    setSaving(true)
    await bookingsApi.refuse(refusing.ID, comment)
    setSaving(false)
    setRefusing(null)
    setComment("")
    load()
  }

  const filtered = filterStatus === "all"
    ? bookings
    : bookings.filter(b => b.Status === filterStatus)

  const pending = bookings.filter(b => b.Status === "en_attente").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-digicampus-text-primary">
            Demandes de réservation
          </h1>
          {pending > 0 && (
            <p className="text-sm text-digicampus-warning mt-1">
              {pending} demande{pending > 1 ? "s" : ""} en attente de validation
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {["en_attente","validee","refusee","all"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              className={filterStatus === s ? "bg-digicampus-primary text-white" : ""}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "Toutes" : statusConfig[s]?.label ?? s}
            </Button>
          ))}
        </div>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-digicampus-text-secondary">
                    Aucune demande
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
        <DialogContent>
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
