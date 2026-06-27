"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { bookingsApi } from "@/lib/api/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Search, Clock, CalendarDays, Calendar } from "lucide-react"
import { toast } from "sonner"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDuration(date: string, start: string, end: string): number {
  return Math.round(
    (new Date(`${date}T${end}`).getTime() - new Date(`${date}T${start}`).getTime()) / 60_000
  )
}

function durationLabel(minutes: number): string {
  if (minutes <= 0) return ""
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
}

// ─── Schéma ───────────────────────────────────────────────────────────────────

const schema = z.object({
  program:      z.string().min(1, "Nom du programme requis"),
  mode:         z.enum(["single", "period"]),
  date:         z.string().optional(),
  start_date:   z.string().optional(),
  end_date:     z.string().optional(),
  start_time:   z.string().min(1, "Heure de début requise"),
  end_time:     z.string().min(1, "Heure de fin requise"),
  participants: z.string(),
}).superRefine((data, ctx) => {
  if (data.mode === "single" && !data.date) {
    ctx.addIssue({ code: "custom", message: "Date requise", path: ["date"] })
  }
  if (data.mode === "period") {
    if (!data.start_date)
      ctx.addIssue({ code: "custom", message: "Date de début requise", path: ["start_date"] })
    if (!data.end_date)
      ctx.addIssue({ code: "custom", message: "Date de fin requise", path: ["end_date"] })
    if (data.start_date && data.end_date && data.end_date < data.start_date)
      ctx.addIssue({ code: "custom", message: "La date de fin doit être après la date de début", path: ["end_date"] })
  }
  const refDate = data.mode === "single" ? data.date : data.start_date
  if (refDate && data.start_time && data.end_time && calcDuration(refDate, data.start_time, data.end_time) <= 0)
    ctx.addIssue({ code: "custom", message: "L'heure de fin doit être après l'heure de début", path: ["end_time"] })
})

type FormValues = z.infer<typeof schema>

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const router = useRouter()
  const [availableSpaces, setAvailableSpaces] = useState<Space[] | null>(null)
  const [selectedSpace, setSelectedSpace]     = useState<Space | null>(null)
  const [searching, setSearching]             = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [isUrgent, setIsUrgent]               = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      program: "", mode: "single",
      date: "", start_date: "", end_date: "",
      start_time: "", end_time: "",
      participants: "1",
    },
  })

  const mode        = form.watch("mode")
  const watchDate   = form.watch("date")
  const watchStart  = form.watch("start_date")
  const watchEnd    = form.watch("end_date")
  const watchSTime  = form.watch("start_time")
  const watchETime  = form.watch("end_time")

  const refDate = mode === "single" ? watchDate : watchStart
  const duration = refDate && watchSTime && watchETime
    ? calcDuration(refDate, watchSTime, watchETime)
    : 0

  const nbDays = mode === "period" && watchStart && watchEnd && watchEnd >= watchStart
    ? daysBetween(watchStart, watchEnd)
    : 0

  function switchMode(m: "single" | "period") {
    form.setValue("mode", m)
    setAvailableSpaces(null)
    setSelectedSpace(null)
  }

  async function searchSpaces() {
    const values = form.getValues()
    const refD = values.mode === "single" ? values.date : values.start_date
    if (!refD || !values.start_time || !values.end_time) {
      toast.error("Remplissez les dates et horaires avant de rechercher")
      return
    }
    const dur = calcDuration(refD, values.start_time, values.end_time)
    if (dur <= 0) { toast.error("Vérifiez les horaires sélectionnés"); return }

    setSearching(true)
    setSelectedSpace(null)
    setAvailableSpaces(null)

    try {
      const startISO = new Date(`${refD}T${values.start_time}`).toISOString()
      const endDate  = values.mode === "period" ? values.end_date : undefined
      const res = await spacesApi.available(startISO, dur, parseInt(values.participants) || 1, endDate)
      setAvailableSpaces(res.data ?? [])
    } catch {
      toast.error("Impossible de joindre le serveur")
    } finally {
      setSearching(false)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!selectedSpace) { toast.error("Veuillez sélectionner une salle"); return }

    setSubmitting(true)

    if (values.mode === "single") {
      const dur = calcDuration(values.date!, values.start_time, values.end_time)
      const res = await (isUrgent ? bookingsApi.createUrgent : bookingsApi.create)({
        space_id:     selectedSpace.id,
        program:      values.program,
        start_time:   new Date(`${values.date}T${values.start_time}`).toISOString(),
        duration:     dur,
        participants: parseInt(values.participants) || 1,
      })
      setSubmitting(false)
      if (res.error) { toast.error(res.error); return }
      toast.success("Demande envoyée — en attente de validation")
      router.push("/bookings")
      return
    }

    // Période : une demande par jour
    const dur          = calcDuration(values.start_date!, values.start_time, values.end_time)
    const participants = parseInt(values.participants) || 1
    const current      = new Date(values.start_date! + "T12:00:00")
    const endLimit     = new Date(values.end_date!   + "T12:00:00")
    let created = 0
    let errors  = 0

    while (current <= endLimit) {
      const dateStr = current.toISOString().split("T")[0]
      const res = await (isUrgent ? bookingsApi.createUrgent : bookingsApi.create)({
        space_id:     selectedSpace.id,
        program:      values.program,
        start_time:   new Date(`${dateStr}T${values.start_time}`).toISOString(),
        duration:     dur,
        participants,
      })
      if (res.error) errors++
      else created++
      current.setDate(current.getDate() + 1)
    }

    setSubmitting(false)
    if (errors > 0 && created === 0) {
      toast.error("Aucune demande n'a pu être créée")
    } else if (errors > 0) {
      toast.success(`${created} demande(s) envoyée(s), ${errors} échec(s)`)
      router.push("/bookings")
    } else {
      toast.success(`${created} demande(s) envoyée(s) — en attente de validation`)
      router.push("/bookings")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">
          Nouvelle demande de salle
        </h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Demandez une salle pour votre programme ou activité
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Colonne formulaire (2/3) ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-digicampus-text-primary">Détails de la demande</h2>
            </div>
            <div className="px-6 py-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  {/* Programme */}
                  <FormField control={form.control} name="program" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Programme / Intitulé</FormLabel>
                      <FormControl>
                        <Input placeholder="Formation React, Réunion équipe…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Mode */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchMode("single")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        mode === "single"
                          ? "bg-digicampus-primary text-white border-digicampus-primary"
                          : "border-border text-digicampus-text-secondary hover:border-digicampus-primary/50"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Journée unique
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("period")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        mode === "period"
                          ? "bg-digicampus-primary text-white border-digicampus-primary"
                          : "border-border text-digicampus-text-secondary hover:border-digicampus-primary/50"
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      Période
                    </button>
                  </div>

                  {/* Date(s) */}
                  {mode === "single" ? (
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="start_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de début</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="end_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de fin</FormLabel>
                          <FormControl><Input type="date" min={watchStart} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {/* Horaires */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="start_time" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de début</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="end_time" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de fin</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Résumé durée / période */}
                  {duration > 0 && (
                    <div className="flex items-center gap-3 text-sm text-digicampus-text-secondary bg-digicampus-neutral rounded-xl px-3 py-2.5">
                      <Clock className="w-4 h-4 text-digicampus-primary shrink-0" />
                      <span>
                        Durée : <span className="font-medium text-digicampus-text-primary">{durationLabel(duration)}</span>
                        {mode === "period" && nbDays > 0 && (
                          <span className="ml-3">
                            · <span className="font-medium text-digicampus-text-primary">{nbDays} jour{nbDays > 1 ? "s" : ""}</span>
                            {" "}= <span className="font-medium text-digicampus-text-primary">{nbDays} demande{nbDays > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Participants */}
                  <FormField control={form.control} name="participants" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de participants</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Urgence */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="urgent"
                      checked={isUrgent}
                      onChange={e => setIsUrgent(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="urgent" className="text-sm text-digicampus-text-secondary">
                      Demande urgente (moins de 24h)
                    </label>
                  </div>

                  {/* Recherche */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={searchSpaces}
                    disabled={searching}
                    className="w-full rounded-xl"
                  >
                    {searching
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Search className="w-4 h-4 mr-2" />}
                    {mode === "period" && nbDays > 0
                      ? `Rechercher — disponible sur les ${nbDays} jours`
                      : "Rechercher les salles disponibles"}
                  </Button>

                  {/* Résultats */}
                  {availableSpaces !== null && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-digicampus-text-primary">
                        {availableSpaces.length === 0
                          ? "Aucune salle disponible sur ce créneau"
                          : `${availableSpaces.length} salle(s) disponible(s)`}
                      </p>
                      {availableSpaces.map(s => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSpace(s)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                            selectedSpace?.id === s.id
                              ? "border-digicampus-primary bg-digicampus-primary/5"
                              : "border-border hover:border-digicampus-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{s.name}</span>
                            <Badge variant="secondary">{s.capacity} places</Badge>
                          </div>
                          {s.equipment_fixed?.length > 0 && (
                            <p className="text-xs text-digicampus-text-secondary mt-1">
                              {s.equipment_fixed.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white rounded-xl"
                    disabled={submitting || !selectedSpace}
                  >
                    {submitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : mode === "period" && nbDays > 0
                        ? `Soumettre ${nbDays} demande${nbDays > 1 ? "s" : ""}`
                        : "Soumettre la demande"}
                  </Button>

                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* ── Colonne info (1/3) ── */}
        <div className="space-y-4">
          {/* Règles */}
          <div className="rounded-xl border border-digicampus-primary/20 bg-digicampus-primary/5 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-digicampus-primary/10">
              <h3 className="text-sm font-semibold text-digicampus-primary">Règles de réservation</h3>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm text-digicampus-text-secondary">
              <p>• Délai minimum <span className="font-medium text-digicampus-text-primary">24h</span> avant le créneau</p>
              <p>• Cochez <span className="font-medium text-digicampus-text-primary">Demande urgente</span> pour passer outre ce délai</p>
              <p>• La salle est confirmée après validation par un admin</p>
              <p>• En mode Période, une demande est créée par jour</p>
            </div>
          </div>

          {/* Comment réserver */}
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-digicampus-text-primary">Comment réserver ?</h3>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-digicampus-text-secondary">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-digicampus-primary text-white text-xs flex items-center justify-center shrink-0 font-medium">1</span>
                <p>Renseignez le programme, les dates et horaires</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-digicampus-primary text-white text-xs flex items-center justify-center shrink-0 font-medium">2</span>
                <p>Recherchez les salles disponibles pour ce créneau</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-digicampus-primary text-white text-xs flex items-center justify-center shrink-0 font-medium">3</span>
                <p>Sélectionnez une salle et soumettez la demande</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
