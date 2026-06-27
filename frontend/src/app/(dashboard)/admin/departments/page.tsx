"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { departmentsApi, type Department } from "@/lib/api/departments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Pencil } from "lucide-react"

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  interne:    { label: "DigiFemmes",     color: "bg-digicampus-primary/10 text-digicampus-primary" },
  partenaire: { label: "Partenaire",     color: "bg-digicampus-warning/10 text-digicampus-warning" },
  externe:    { label: "Externe",        color: "bg-digicampus-secondary/10 text-digicampus-secondary-dark" },
}

type DialogState = {
  open: boolean
  editing: Department | null
  name: string
  category: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [dialog, setDialog] = useState<DialogState>({
    open: false, editing: null, name: "", category: "interne",
  })

  async function load() {
    setLoading(true)
    const res = await departmentsApi.list()
    if (res.data) setDepartments(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setDialog({ open: true, editing: null, name: "", category: "interne" })
  }

  function openEdit(d: Department) {
    setDialog({ open: true, editing: d, name: d.name, category: d.category })
  }

  function closeDialog() {
    setDialog(prev => ({ ...prev, open: false }))
  }

  async function handleSave() {
    if (!dialog.name.trim()) { toast.error("Le nom est requis"); return }
    setSaving(true)
    try {
      if (dialog.editing) {
        const res = await departmentsApi.update(dialog.editing.id, dialog.name.trim())
        if (res.error) { toast.error(res.error); return }
        toast.success("Département renommé")
      } else {
        const res = await departmentsApi.create(dialog.name.trim(), dialog.category)
        if (res.error) { toast.error(res.error); return }
        toast.success("Département créé")
      }
      closeDialog()
      load()
    } catch {
      toast.error("Impossible de joindre le serveur")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(d: Department) {
    try {
      await departmentsApi.deactivate(d.id)
      toast.success(`${d.name} désactivé`)
      load()
    } catch {
      toast.error("Erreur lors de la désactivation")
    }
  }

  async function handleActivate(d: Department) {
    try {
      await departmentsApi.activate(d.id)
      toast.success(`${d.name} activé`)
      load()
    } catch {
      toast.error("Erreur lors de l'activation")
    }
  }

  const interne  = departments.filter(d => d.category === "interne")
  const partners = departments.filter(d => d.category === "partenaire")

  function DeptTable({ rows, emptyLabel }: { rows: Department[]; emptyLabel: string }) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-digicampus-text-secondary">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : rows.map(d => {
              const cfg = CATEGORY_CONFIG[d.category] ?? { label: d.category, color: "" }
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      d.is_active
                        ? "bg-digicampus-success/10 text-digicampus-success"
                        : "bg-digicampus-danger/10 text-digicampus-danger"
                    }>
                      {d.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {d.is_active && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Renommer
                        </Button>
                      )}
                      {d.is_active ? (
                        <Button size="sm" variant="destructive" onClick={() => handleDeactivate(d)}>
                          Désactiver
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-digicampus-success text-digicampus-success hover:bg-digicampus-success/10"
                          onClick={() => handleActivate(d)}
                        >
                          Activer
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Départements</h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Gérez les départements internes et les entreprises partenaires
          </p>
        </div>
        <Button
          className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white shrink-0"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-digicampus-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold text-digicampus-text-secondary uppercase tracking-wider mb-3">
              Départements DigiFemmes
            </h2>
            <DeptTable rows={interne} emptyLabel="Aucun département — créez le premier" />
          </section>

          <section>
            <h2 className="text-xs font-semibold text-digicampus-text-secondary uppercase tracking-wider mb-3">
              Entreprises partenaires
            </h2>
            <DeptTable rows={partners} emptyLabel="Aucun partenaire — ajoutez-en un" />
          </section>
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.editing ? "Renommer" : "Nouveau département"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {!dialog.editing && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-digicampus-text-primary">Type</label>
                <Select
                  value={dialog.category}
                  onValueChange={(v: string | null) => { if (v) setDialog(prev => ({ ...prev, category: v })) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interne">Département DigiFemmes</SelectItem>
                    <SelectItem value="partenaire">Entreprise partenaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-digicampus-text-primary">Nom</label>
              <Input
                placeholder={dialog.category === "partenaire" ? "Ex : ADEC, Fineo…" : "Ex : Finance, RH…"}
                value={dialog.name}
                onChange={e => setDialog(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button
              className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
