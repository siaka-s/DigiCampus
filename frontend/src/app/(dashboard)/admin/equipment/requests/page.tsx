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
import { Loader2, AlertTriangle, Clock, CheckCircle, Search } from "lucide-react"
import { toast } from "sonner"
import { StatCard } from "@/components/stat-card"

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
  const [search, setSearch]       = useState("")

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
    const res = await equipmentApi.validate(id)
    if (res.error) { toast.error(res.error); return }
    toast.success("Demande IT validée")
    load()
  }

  async function submitRefuse() {
    if (!refusing) return
    setSaving(true)
    const res = await equipmentApi.refuse(refusing.ID, comment)
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Demande IT refusée")
    setRefusing(null)
    setComment("")
    load()
  }

  async function closeRental(id: string) {
    const res = await equipmentApi.closeRental(id)
    if (res.error) { toast.error(res.error); return }
    toast.success("Location clôturée")
    load()
  }

  const filtered = (filter === "all" ? requests : requests.filter(r => r.Status === filter))
    .filter(r => {
      if (!search) return true
      const q = search.toLowerCase()
      return (r.Mission ?? "").toLowerCase().includes(q) || (r.Location ?? "").toLowerCase().includes(q)
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">
          Demandes matériel IT
        </h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Gestion des demandes de matériel informatique
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="En attente"
          value={requests.filter(r => r.Status === "en_attente").length}
          icon={Clock}
          iconColor="text-digicampus-warning"
          trend="neutral"
          trendLabel="En attente de traitement"
        />
        <StatCard
          label="En cours"
          value={requests.filter(r => r.Status === "validee").length}
          icon={CheckCircle}
          iconColor="text-digicampus-success"
          trend="up"
          trendLabel="Validées en cours"
        />
        <StatCard
          label="Retards"
          value={overdue.length}
          icon={AlertTriangle}
          iconColor="text-digicampus-danger"
          trendLabel="Non clôturées"
        />
      </div>

      {/* Table card */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-digicampus-text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par mission ou lieu…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 ml-auto">
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
