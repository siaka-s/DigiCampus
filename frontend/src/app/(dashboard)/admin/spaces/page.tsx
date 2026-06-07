"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { spacesApi, type Space } from "@/lib/api/spaces"
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
import { Loader2, Plus, X } from "lucide-react"

const TYPES = [
  { value: "salle_programme",   label: "Salle de programme",   color: "bg-digicampus-primary/10 text-digicampus-primary" },
  { value: "bureau_individuel", label: "Bureau individuel",     color: "bg-digicampus-secondary/10 text-digicampus-secondary" },
  { value: "bureau_partage",    label: "Bureau partagé",        color: "bg-digicampus-warning/10 text-digicampus-warning" },
]

const typeInfo = (t: string) => TYPES.find((x) => x.value === t) ?? { label: t, color: "" }

const schema = z.object({
  name:     z.string().min(1, "Nom requis"),
  type:     z.string().min(1, "Type requis"),
  capacity: z.string(),
  seats:    z.string(),
})

type FormValues = z.infer<typeof schema>

export default function SpacesPage() {
  const [spaces, setSpaces]       = useState<Space[]>([])
  const [loading, setLoading]     = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]     = useState<Space | null>(null)
  const [equipment, setEquipment] = useState<string[]>([])
  const [eqInput, setEqInput]     = useState("")
  const [saving, setSaving]       = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "", capacity: "0", seats: "0" },
  })

  async function loadSpaces() {
    setLoading(true)
    const res = await spacesApi.list()
    if (res.data) setSpaces(res.data)
    setLoading(false)
  }

  useEffect(() => { loadSpaces() }, [])

  function openCreate() {
    setEditing(null)
    setEquipment([])
    form.reset({ name: "", type: "", capacity: "0", seats: "0" })
    setDialogOpen(true)
  }

  function openEdit(s: Space) {
    setEditing(s)
    setEquipment(s.EquipmentFixed ?? [])
    form.reset({ name: s.Name, type: s.Type, capacity: String(s.Capacity), seats: String(s.Seats) })
    setDialogOpen(true)
  }

  function addEquipment() {
    const val = eqInput.trim()
    if (val && !equipment.includes(val)) setEquipment([...equipment, val])
    setEqInput("")
  }

  function removeEquipment(item: string) {
    setEquipment(equipment.filter((e) => e !== item))
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const payload = {
      name:            values.name,
      type:            values.type,
      capacity:        parseInt(values.capacity) || 0,
      seats:           parseInt(values.seats) || 0,
      equipment_fixed: equipment,
    }
    if (editing) {
      await spacesApi.update(editing.ID, payload)
    } else {
      await spacesApi.create(payload)
    }
    setSaving(false)
    setDialogOpen(false)
    loadSpaces()
  }

  async function deactivate(id: string) {
    await spacesApi.deactivate(id)
    loadSpaces()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">
          Référentiel des espaces
        </h1>
        <Button
          className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel espace
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-digicampus-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Places assises</TableHead>
                <TableHead>Équipements fixes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-digicampus-text-secondary">
                    Aucun espace — créez le premier
                  </TableCell>
                </TableRow>
              ) : (
                spaces.map((s) => {
                  const info = typeInfo(s.Type)
                  return (
                    <TableRow key={s.ID}>
                      <TableCell className="font-medium">{s.Name}</TableCell>
                      <TableCell>
                        <Badge className={info.color}>{info.label}</Badge>
                      </TableCell>
                      <TableCell>{s.Capacity}</TableCell>
                      <TableCell>{s.Seats}</TableCell>
                      <TableCell className="text-digicampus-text-secondary text-sm">
                        {s.EquipmentFixed?.length
                          ? s.EquipmentFixed.join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.IsActive
                              ? "bg-digicampus-success/10 text-digicampus-success"
                              : "bg-digicampus-danger/10 text-digicampus-danger"
                          }
                        >
                          {s.IsActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            Modifier
                          </Button>
                          {s.IsActive && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivate(s.ID)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'espace" : "Nouvel espace"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl><Input placeholder="Salle Afrique" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité maximale</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="seats" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Places assises (bureaux)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Équipements fixes */}
              <div className="space-y-2">
                <FormLabel>Équipements fixes</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={eqInput}
                    onChange={(e) => setEqInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEquipment())}
                    placeholder='Ex: TV 55", Projecteur'
                  />
                  <Button type="button" variant="outline" onClick={addEquipment}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {equipment.map((eq) => (
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
                  disabled={saving}
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
