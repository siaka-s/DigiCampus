"use client"

import { useEffect, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { spacesApi, type Space } from "@/lib/api/spaces"
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
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Loader2, Plus, X, Users, MapPin, MonitorPlay, Building2, LayoutGrid, CheckCircle2 } from "lucide-react"
import { StatCard } from "@/components/stat-card"

const TYPES = [
  { value: "salle_programme",   label: "Salle de programme", color: "bg-digicampus-primary/10 text-digicampus-primary" },
  { value: "bureau_individuel", label: "Bureau individuel",  color: "bg-digicampus-secondary/10 text-digicampus-secondary-dark" },
  { value: "bureau_partage",    label: "Bureau d'équipe",    color: "bg-digicampus-warning/10 text-digicampus-warning" },
]

const typeInfo = (t: string) => TYPES.find(x => x.value === t) ?? { label: t, color: "" }

const schema = z.object({
  name:     z.string().min(1, "Nom requis"),
  type:     z.string().min(1, "Type requis"),
  location: z.string(),
  capacity: z.coerce.number().min(1, "Minimum 1").optional(),
  seats:    z.coerce.number().min(1, "Minimum 1").optional(),
})

type FormValues = z.infer<typeof schema>

export default function SpacesPage() {
  const [spaces, setSpaces]               = useState<Space[]>([])
  const [departments, setDepartments]     = useState<Department[]>([])
  const [loading, setLoading]             = useState(true)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<Space | null>(null)
  const [equipment, setEquipment]         = useState<string[]>([])
  const [eqInput, setEqInput]             = useState("")
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [saving, setSaving]               = useState(false)
  const [search, setSearch]               = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { name: "", type: "", location: "", capacity: undefined, seats: undefined },
  })

  const watchedType = form.watch("type")

  useEffect(() => {
    loadSpaces()
    departmentsApi.list().then(res => {
      if (res.data) setDepartments(res.data.filter(d => d.is_active))
    })
  }, [])

  async function loadSpaces() {
    setLoading(true)
    const res = await spacesApi.list()
    if (res.data) setSpaces(res.data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setEquipment([])
    setSelectedDepts([])
    form.reset({ name: "", type: "", location: "", capacity: undefined, seats: undefined })
    setDialogOpen(true)
  }

  function openEdit(s: Space) {
    setEditing(s)
    setEquipment(s.equipment_fixed ?? [])
    setSelectedDepts(s.departments?.map(d => d.id) ?? [])
    form.reset({
      name:     s.name,
      type:     s.type,
      location: s.location ?? "",
      capacity: s.capacity || undefined,
      seats:    s.seats || undefined,
    })
    setDialogOpen(true)
  }

  function toggleDept(id: string) {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  function addEquipment() {
    const val = eqInput.trim()
    if (val && !equipment.includes(val)) setEquipment(prev => [...prev, val])
    setEqInput("")
  }

  function removeEquipment(item: string) {
    setEquipment(prev => prev.filter(e => e !== item))
  }

  async function onSubmit(values: FormValues) {
    let capacity = 0, seats = 0
    let equipment_fixed: string[] = []
    let department_ids: string[] = []

    if (values.type === "salle_programme") {
      if (!values.capacity) { toast.error("Capacité maximale requise"); return }
      capacity = values.capacity
      seats = 0
      equipment_fixed = equipment
    } else if (values.type === "bureau_individuel") {
      if (!values.seats) { toast.error("Nombre de places assises requis"); return }
      capacity = 1
      seats = values.seats
      equipment_fixed = equipment
    } else {
      if (!values.seats) { toast.error("Nombre de places assises requis"); return }
      seats = values.seats
      capacity = seats
      department_ids = selectedDepts
    }

    const payload = {
      name:            values.name,
      type:            values.type,
      capacity,
      seats,
      location:        values.location ?? "",
      equipment_fixed,
      department_ids,
    }

    setSaving(true)
    try {
      const res = editing
        ? await spacesApi.update(editing.id, payload)
        : await spacesApi.create(payload)

      if (res.error) { toast.error(res.error); return }

      toast.success(editing ? "Espace mis à jour" : "Espace créé")
      setDialogOpen(false)
      loadSpaces()
    } catch {
      toast.error("Impossible de joindre le serveur")
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string) {
    try {
      await spacesApi.deactivate(id)
      toast.success("Espace désactivé")
      loadSpaces()
    } catch {
      toast.error("Erreur lors de la désactivation")
    }
  }

  // Stat counts
  const countSalles       = spaces.filter(s => s.type === "salle_programme").length
  const countPartages     = spaces.filter(s => s.type === "bureau_partage").length
  const countIndividuels  = spaces.filter(s => s.type === "bureau_individuel").length
  const countActifs       = spaces.filter(s => s.is_active).length

  // Client-side search filter
  const filtered = search.trim()
    ? spaces.filter(s => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    : spaces

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">
            Référentiel des espaces
          </h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Gérez les salles et bureaux du campus
          </p>
        </div>
        <Button
          className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel espace
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Salles de programme"
          value={countSalles}
          icon={MonitorPlay}
          iconColor="text-digicampus-primary"
          trendLabel="Réservables"
          trend="neutral"
        />
        <StatCard
          label="Bureaux partagés"
          value={countPartages}
          icon={Users}
          iconColor="text-digicampus-warning"
          trendLabel="Équipes"
          trend="neutral"
        />
        <StatCard
          label="Bureaux individuels"
          value={countIndividuels}
          icon={Building2}
          iconColor="text-digicampus-secondary-dark"
          trendLabel="Affectés"
          trend="neutral"
        />
        <StatCard
          label="Actifs"
          value={countActifs}
          icon={CheckCircle2}
          iconColor="text-digicampus-success"
          trendLabel="En service"
          trend="up"
        />
      </div>

      {/* Table card */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-xl" />
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <p className="text-sm font-medium text-digicampus-text-secondary">
              {filtered.length} espace{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="w-64">
              <Input
                placeholder="Rechercher par nom…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Capacité / Places</TableHead>
                <TableHead>Équipements / Départements</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-digicampus-text-secondary">
                    {search ? "Aucun espace ne correspond à cette recherche" : "Aucun espace — créez le premier"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(s => {
                  const info = typeInfo(s.type)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge className={info.color}>{info.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">
                        {s.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {s.location}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">
                        {s.type === "salle_programme" && `${s.capacity} pers. max`}
                        {s.type === "bureau_individuel" && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            1 occupant · {s.seats} siège{s.seats > 1 ? "s" : ""}
                          </span>
                        )}
                        {s.type === "bureau_partage" && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {s.seats} place{s.seats > 1 ? "s" : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary max-w-[200px]">
                        {s.type === "bureau_partage"
                          ? s.departments?.length
                            ? s.departments.map(d => d.name).join(", ")
                            : "—"
                          : s.equipment_fixed?.length
                            ? s.equipment_fixed.join(", ")
                            : "—"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.is_active
                              ? "bg-digicampus-success/10 text-digicampus-success"
                              : "bg-digicampus-danger/10 text-digicampus-danger"
                          }
                        >
                          {s.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            Modifier
                          </Button>
                          {s.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivate(s.id)}
                            >
                              Désactiver
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'espace" : "Nouvel espace"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Nom */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : Salle Afrique, Bureau 201…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Type */}
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type d'espace</FormLabel>
                  <Select value={field.value} onValueChange={v => { field.onChange(v ?? ""); setEquipment([]); setSelectedDepts([]) }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Localisation */}
              {watchedType && (
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation <span className="text-digicampus-text-secondary font-normal">(optionnel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex : Étage 1 — Aile Nord" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* ─── Salle de programme ─── */}
              {watchedType === "salle_programme" && (
                <>
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacité maximale <span className="text-digicampus-text-secondary font-normal">(participants)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="Ex : 30" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-2">
                    <FormLabel>Équipements fixes</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        value={eqInput}
                        onChange={e => setEqInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEquipment())}
                        placeholder='Ex : TV 55", Projecteur, Tableau blanc'
                      />
                      <Button type="button" variant="outline" onClick={addEquipment}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {equipment.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {equipment.map(eq => (
                          <Badge key={eq} variant="secondary" className="gap-1">
                            {eq}
                            <button type="button" onClick={() => removeEquipment(eq)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Bureau individuel ─── */}
              {watchedType === "bureau_individuel" && (
                <>
                  <div className="rounded-xl bg-digicampus-secondary/10 border border-digicampus-secondary/20 px-3 py-2.5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-digicampus-secondary-dark shrink-0" />
                    <p className="text-sm text-digicampus-secondary-dark">
                      Capacité fixe : <strong>1 occupant</strong> — bureau attribué à une seule personne
                    </p>
                  </div>

                  <FormField control={form.control} name="seats" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Places assises <span className="text-digicampus-text-secondary font-normal">(sièges disponibles dans la pièce)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="Ex : 2" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-2">
                    <FormLabel>Matériel IT assigné</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        value={eqInput}
                        onChange={e => setEqInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEquipment())}
                        placeholder='Ex : MacBook Pro 14", Écran 27", Dock USB-C'
                      />
                      <Button type="button" variant="outline" onClick={addEquipment}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {equipment.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {equipment.map(eq => (
                          <Badge key={eq} variant="secondary" className="gap-1">
                            {eq}
                            <button type="button" onClick={() => removeEquipment(eq)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Bureau d'équipe ─── */}
              {watchedType === "bureau_partage" && (
                <>
                  <FormField control={form.control} name="seats" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Places assises <span className="text-digicampus-text-secondary font-normal">(postes de travail disponibles)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="Ex : 8" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-2">
                    <FormLabel>
                      Départements associés
                      <span className="text-digicampus-text-secondary font-normal ml-1">(optionnel)</span>
                    </FormLabel>
                    {departments.filter(d => d.category === "interne").length === 0 ? (
                      <p className="text-sm text-digicampus-text-secondary">Aucun département actif</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {departments.filter(d => d.category === "interne").map(dept => (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => toggleDept(dept.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                              selectedDepts.includes(dept.id)
                                ? "bg-digicampus-primary text-white border-digicampus-primary"
                                : "bg-white text-digicampus-text-secondary border-border hover:border-digicampus-primary/50"
                            }`}
                          >
                            {dept.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
                  disabled={saving || !watchedType}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
