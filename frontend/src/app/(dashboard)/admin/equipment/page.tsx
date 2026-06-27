"use client"

import { useEffect, useState } from "react"
import { equipmentApi, type Equipment } from "@/lib/api/equipment"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Monitor, CheckCircle2, Package, AlertTriangle, Search } from "lucide-react"
import { StatCard } from "@/components/stat-card"

const statusConfig: Record<string, string> = {
  disponible:  "bg-digicampus-success/10 text-digicampus-success",
  attribue:    "bg-digicampus-warning/10 text-digicampus-warning",
  en_location: "bg-digicampus-primary/10 text-digicampus-primary",
}
const statusLabels: Record<string, string> = {
  disponible: "Disponible", attribue: "Attribué", en_location: "En location",
}

type StatusFilter = "tous" | "disponible" | "attribue" | "en_location"

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "tous",        label: "Tous" },
  { value: "disponible",  label: "Disponible" },
  { value: "attribue",    label: "Attribué" },
  { value: "en_location", label: "En location" },
]

export default function AdminEquipmentPage() {
  const [items, setItems]       = useState<Equipment[]>([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAddOpen]   = useState(false)
  const [editItem, setEditItem] = useState<Equipment | null>(null)
  const [newType, setNewType]   = useState("")
  const [newName, setNewName]   = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous")

  async function load() {
    setLoading(true)
    const res = await equipmentApi.list()
    if (res.data) setItems(res.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addEquipment() {
    if (!newType || !newName) return
    setSaving(true)
    await equipmentApi.add({ type: newType, name: newName })
    setSaving(false)
    setAddOpen(false)
    setNewType(""); setNewName("")
    load()
  }

  async function saveEdit() {
    if (!editItem) return
    setSaving(true)
    await equipmentApi.update(editItem.ID, { status: editStatus })
    setSaving(false)
    setEditItem(null)
    load()
  }

  const overdueCount    = items.filter(i => i.Status === "en_location" && i.ReturnDate && new Date(i.ReturnDate) < new Date()).length
  const disponibleCount = items.filter(i => i.Status === "disponible").length
  const locationCount   = items.filter(i => i.Status === "en_location").length

  const filtered = items.filter(e => {
    const matchSearch = search === "" ||
      e.Name.toLowerCase().includes(search.toLowerCase()) ||
      e.Type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "tous" || e.Status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Parc informatique</h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Gérez les équipements, leur statut et les locations en cours
          </p>
        </div>
        <Button className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={items.length}
            icon={Monitor}
          />
          <StatCard
            label="Disponibles"
            value={disponibleCount}
            icon={CheckCircle2}
            iconColor="text-digicampus-success"
          />
          <StatCard
            label="En location"
            value={locationCount}
            icon={Package}
            iconColor="text-digicampus-primary"
          />
          <StatCard
            label="Retards"
            value={overdueCount}
            icon={AlertTriangle}
            iconColor="text-digicampus-danger"
          />
        </div>
      )}

      {/* Table card */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-digicampus-text-secondary" />
              <Input
                placeholder="Rechercher par nom ou type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === tab.value
                      ? "bg-digicampus-primary text-white"
                      : "text-digicampus-text-secondary hover:bg-digicampus-neutral"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Retour prévu</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-digicampus-text-secondary">
                    {items.length === 0
                      ? "Aucun équipement — ajoutez le premier"
                      : "Aucun équipement ne correspond aux filtres"}
                  </TableCell>
                </TableRow>
              ) : filtered.map(e => {
                const isOverdue = e.Status === "en_location" && e.ReturnDate && new Date(e.ReturnDate) < new Date()
                return (
                  <TableRow key={e.ID} className={isOverdue ? "bg-digicampus-danger/5" : ""}>
                    <TableCell className="font-medium">{e.Name}</TableCell>
                    <TableCell className="text-digicampus-text-secondary">{e.Type}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[e.Status] ?? ""}>{statusLabels[e.Status] ?? e.Status}</Badge>
                      {isOverdue && <Badge className="ml-2 bg-digicampus-danger/10 text-digicampus-danger text-xs">En retard</Badge>}
                    </TableCell>
                    <TableCell className="text-digicampus-text-secondary">
                      {e.ReturnDate ? new Date(e.ReturnDate).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEditItem(e); setEditStatus(e.Status) }}>
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog ajout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un équipement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Input value={newType} onChange={e => setNewType(e.target.value)} placeholder="laptop, tablette…" />
            </div>
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="MacBook Pro 14" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white" onClick={addEquipment} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog édition statut */}
      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le statut</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Statut</Label>
            <Select value={editStatus} onValueChange={v => setEditStatus(v ?? "disponible")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="attribue">Attribué</SelectItem>
                <SelectItem value="en_location">En location</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Annuler</Button>
            <Button className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
