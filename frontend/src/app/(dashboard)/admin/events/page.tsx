"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Eye, EyeOff, Calendar, Clock, MapPin } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { eventsApi, AdminEvent, EventType } from "@/lib/api/events"

const TYPE_LABELS: Record<EventType, string> = {
  formation:  "Formation",
  atelier:    "Atelier",
  conference: "Conférence",
  reunion:    "Réunion",
  autre:      "Autre",
}

const TYPE_COLORS: Record<EventType, string> = {
  formation:  "bg-digicampus-secondary/10 text-digicampus-secondary-dark border-digicampus-secondary/20",
  atelier:    "bg-digicampus-primary/10 text-digicampus-primary-dark border-digicampus-primary/20",
  conference: "bg-purple-50 text-purple-700 border-purple-200",
  reunion:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  autre:      "bg-gray-100 text-gray-600 border-gray-200",
}

const schema = z.object({
  title:       z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  date:        z.string().min(1, "Date requise"),
  start_time:  z.string().min(1, "Heure de début requise"),
  end_time:    z.string().min(1, "Heure de fin requise"),
  location:    z.string().optional(),
  type:        z.enum(["formation", "atelier", "conference", "reunion", "autre"]),
})
type FormValues = z.infer<typeof schema>

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default function AdminEventsPage() {
  const [events, setEvents]         = useState<AdminEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<AdminEvent | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "autre" },
  })

  const typeValue = watch("type")

  async function load() {
    const r = await eventsApi.listAll()
    setEvents(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ type: "autre" })
    setDialogOpen(true)
  }

  function openEdit(e: AdminEvent) {
    setEditing(e)
    reset({
      title:       e.title,
      description: e.description,
      date:        e.date,
      start_time:  e.start_time.slice(0, 5),
      end_time:    e.end_time.slice(0, 5),
      location:    e.location,
      type:        e.type as EventType,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      if (editing) {
        await eventsApi.update(editing.id, values)
        toast.success("Événement modifié")
      } else {
        await eventsApi.create(values)
        toast.success("Événement créé")
      }
      setDialogOpen(false)
      load()
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePublish(e: AdminEvent) {
    try {
      if (e.is_published) {
        await eventsApi.unpublish(e.id)
        toast.success("Événement dépublié")
      } else {
        await eventsApi.publish(e.id)
        toast.success("Événement publié — visible par les collaborateurs")
      }
      load()
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  async function handleDelete(e: AdminEvent) {
    if (!confirm(`Supprimer l'événement "${e.title}" ?`)) return
    try {
      await eventsApi.delete(e.id)
      toast.success("Événement supprimé")
      load()
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-digicampus-text-primary">Événements campus</h1>
          <p className="text-sm text-digicampus-text-secondary mt-0.5">
            Créez et publiez les événements visibles par les collaborateurs
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvel événement
        </Button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center">
            <Calendar className="w-6 h-6 text-digicampus-text-secondary" />
          </div>
          <p className="font-medium text-digicampus-text-primary">Aucun événement</p>
          <p className="text-sm text-digicampus-text-secondary">Créez votre premier événement campus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(e => (
            <div
              key={e.id}
              className="bg-white rounded-xl border border-border px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Colonne date */}
                <div className="shrink-0 text-center w-12">
                  <p className="text-lg font-bold text-digicampus-primary leading-none">
                    {new Date(e.date + "T00:00:00").getDate()}
                  </p>
                  <p className="text-[10px] uppercase text-digicampus-text-secondary font-medium">
                    {new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { month: "short" })}
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-digicampus-text-primary truncate">
                      {e.title}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[e.type as EventType]}`}>
                      {TYPE_LABELS[e.type as EventType]}
                    </span>
                    {!e.is_published && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
                        Brouillon
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-digicampus-text-secondary flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(e.start_time)} – {formatTime(e.end_time)}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {e.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePublish(e)}
                  title={e.is_published ? "Dépublier" : "Publier"}
                  className={`p-2 rounded-lg transition-colors ${
                    e.is_published
                      ? "text-digicampus-success hover:bg-green-50"
                      : "text-digicampus-text-secondary hover:bg-digicampus-neutral"
                  }`}
                >
                  {e.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(e)}
                  className="p-2 rounded-lg text-digicampus-text-secondary hover:bg-digicampus-neutral transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(e)}
                  className="p-2 rounded-lg text-digicampus-text-secondary hover:bg-red-50 hover:text-digicampus-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input {...register("title")} placeholder="Ex : Formation Excel avancé" />
              {errors.title && <p className="text-xs text-digicampus-danger">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={3} placeholder="Description de l'événement…" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-digicampus-danger">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={typeValue} onValueChange={v => setValue("type", v as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Début *</Label>
                <Input type="time" {...register("start_time")} />
                {errors.start_time && <p className="text-xs text-digicampus-danger">{errors.start_time.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fin *</Label>
                <Input type="time" {...register("end_time")} />
                {errors.end_time && <p className="text-xs text-digicampus-danger">{errors.end_time.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Lieu</Label>
              <Input {...register("location")} placeholder="Ex : Salle polyvalente, Bâtiment B…" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
