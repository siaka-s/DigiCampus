"use client"

import { useEffect, useState } from "react"
import { equipmentApi, type EquipmentRequest } from "@/lib/api/equipment"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle } from "lucide-react"

const statusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente",  className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",     className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",     className: "bg-digicampus-danger/10 text-digicampus-danger" },
  cloturee:   { label: "Clôturée",    className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

const typeLabels: Record<string, string> = {
  interne:          "Mission interne",
  location_externe: "Location externe",
}

export default function AdminEquipmentRequestsPage() {
  const [requests, setRequests]   = useState<EquipmentRequest[]>([])
  const [overdue, setOverdue]     = useState<EquipmentRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [refusing, setRefusing]   = useState<EquipmentRequest | null>(null)
  const [comment, setComment]     = useState("")
  const [saving, setSaving]       = useState(false)
  const [filter, setFilter]       = useState("en_attente")

  async function load() {
    setLoading(true)
    const [reqRes, overdueRes] = await Promise.all([
      equipmentApi.listRequests(),
      equipmentApi.getOverdue(),
    ])
    if (reqRes.data) setRequests(reqRes.data)
    if (overdueRes.data) setOverdue(overdueRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function validate(id: string) {
    await equipmentApi.validate(id)
    load()
  }

  async function submitRefuse() {
    if (!refusing) return
    setSaving(true)
    await equipmentApi.refuse(refusing.ID, comment)
    setSaving(false)
    setRefusing(null)
    setComment("")
    load()
  }

  async function closeRental(id: string) {
    await equipmentApi.closeRental(id)
    load()
  }

  const filtered = filter === "all" ? requests : requests.filter(r => r.Status === filter)
  const pending = requests.filter(r => r.Status === "en_attente").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-digicampus-text-primary">
            Demandes matériel IT
          </h1>
          {pending > 0 && (
            <p className="text-sm text-digicampus-warning mt-1">
              {pending} demande{pending > 1 ? "s" : ""} en attente
            </p>
          )}
          {overdue.length > 0 && (
            <p className="text-sm text-digicampus-danger flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              {overdue.length} location{overdue.length > 1 ? "s" : ""} non clôturée{overdue.length > 1 ? "s" : ""} à l&apos;échéance
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {["en_attente","validee","cloturee","all"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              className={filter === s ? "bg-digicampus-primary text-white" : ""}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "Toutes" : statusConfig[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Mission / Lieu</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-digicampus-text-secondary">
                    Aucune demande
                  </TableCell>
                </TableRow>
              ) : filtered.map(req => {
                const s = statusConfig[req.Status] ?? { label: req.Status, className: "" }
                const isOverdue = overdue.some(o => o.ID === req.ID)
                const start = new Date(req.StartDate).toLocaleDateString("fr-FR")
                const end   = new Date(req.EndDate).toLocaleDateString("fr-FR")
                return (
                  <TableRow key={req.ID} className={isOverdue ? "bg-digicampus-danger/5" : ""}>
                    <TableCell>
                      <Badge variant="secondary">{typeLabels[req.Type] ?? req.Type}</Badge>
                    </TableCell>
                    <TableCell className="text-digicampus-text-secondary">
                      {req.Mission ?? req.Location ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{start} → {end}</TableCell>
                    <TableCell>
                      <Badge className={s.className}>{s.label}</Badge>
                      {isOverdue && <Badge className="ml-2 bg-digicampus-danger/10 text-digicampus-danger text-xs">En retard</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {req.Status === "en_attente" && (
                          <>
                            <Button size="sm" className="bg-digicampus-success hover:bg-digicampus-success/90 text-white" onClick={() => validate(req.ID)}>
                              Valider
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { setRefusing(req); setComment("") }}>
                              Refuser
                            </Button>
                          </>
                        )}
                        {req.Status === "validee" && req.Type === "location_externe" && (
                          <Button size="sm" variant="outline" onClick={() => closeRental(req.ID)}>
                            Clôturer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!refusing} onOpenChange={open => !open && setRefusing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motif de refus</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Commentaire</Label>
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Motif du refus…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusing(null)}>Annuler</Button>
            <Button variant="destructive" onClick={submitRefuse} disabled={!comment.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
