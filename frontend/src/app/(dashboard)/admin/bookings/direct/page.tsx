"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { spacesApi, type Space } from "@/lib/api/spaces"
import { bookingsApi } from "@/lib/api/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Clock, RefreshCw, Timer } from "lucide-react"
import { toast } from "sonner"

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
]

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

// ─── Schéma ───────────────────────────────────────────────────────────────────

const schema = z.object({
  space_id:     z.string().min(1, "Salle requise"),
  program:      z.string().min(1, "Programme requis"),
  date:         z.string().min(1, "Date requise"),
  start_time:   z.string().min(1, "Heure de début requise"),
  end_time:     z.string().min(1, "Heure de fin requise"),
  participants: z.string(),
  is_recurring: z.boolean(),
  end_date:     z.string().optional(),
}).refine(
  data => {
    if (!data.date || !data.start_time || !data.end_time) return true
    return calcDuration(data.date, data.start_time, data.end_time) > 0
  },
  { message: "L'heure de fin doit être après l'heure de début", path: ["end_time"] }
)

type FormValues = z.infer<typeof schema>

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DirectBookingPage() {
  const router = useRouter()
  const [spaces, setSpaces]             = useState<Space[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    spacesApi.list().then(res => {
      if (res.data) setSpaces(res.data.filter(s => s.is_active && s.type === "salle_programme"))
    })
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      space_id: "", program: "",
      date: "", start_time: "", end_time: "",
      participants: "1",
      is_recurring: false, end_date: "",
    },
  })

  const isRecurring  = form.watch("is_recurring")
  const watchedDate  = form.watch("date")
  const watchedStart = form.watch("start_time")
  const watchedEnd   = form.watch("end_time")
  const duration     = watchedDate && watchedStart && watchedEnd
    ? calcDuration(watchedDate, watchedStart, watchedEnd)
    : 0

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)

    const dur          = calcDuration(values.date, values.start_time, values.end_time)
    const participants = parseInt(values.participants) || 1
    const [startH, startM] = values.start_time.split(":").map(Number)

    if (values.is_recurring) {
      if (selectedDays.length === 0) {
        toast.error("Sélectionnez au moins un jour")
        setSubmitting(false)
        return
      }
      if (!values.end_date) {
        toast.error("Date de fin requise pour la récurrence")
        setSubmitting(false)
        return
      }
      const res = await bookingsApi.createRecurring({
        space_id:     values.space_id,
        program:      values.program,
        start_date:   values.date,
        end_date:     values.end_date,
        start_hour:   startH,
        start_minute: startM,
        duration:     dur,
        participants,
        days_of_week: selectedDays,
      })
      if (res.error) { toast.error(res.error); setSubmitting(false); return }
      toast.success("Créneaux récurrents créés")
    } else {
      const res = await bookingsApi.createDirect({
        space_id:   values.space_id,
        program:    values.program,
        start_time: new Date(`${values.date}T${values.start_time}`).toISOString(),
        duration:   dur,
        participants,
      })
      if (res.error) { toast.error(res.error); setSubmitting(false); return }
      toast.success("Salle affectée avec succès")
    }

    setSubmitting(false)
    router.push("/admin/bookings")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">Affectation directe</h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Affectez une salle directement ou créez un créneau récurrent
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Form — left, spans 2 columns */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Détails de l&apos;affectation</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  {/* Salle */}
                  <FormField control={form.control} name="space_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salle</FormLabel>
                      <Select value={field.value} onValueChange={v => field.onChange(v ?? "")}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Choisir une salle" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {spaces.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.capacity} places)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Programme */}
                  <FormField control={form.control} name="program" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Programme / Intitulé</FormLabel>
                      <FormControl><Input placeholder="Formation, réunion…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Date */}
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Heures */}
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

                  {/* Durée calculée */}
                  {duration > 0 && (
                    <div className="flex items-center gap-2 text-sm text-digicampus-text-secondary bg-digicampus-neutral rounded-xl px-3 py-2">
                      <Clock className="w-4 h-4 text-digicampus-primary shrink-0" />
                      <span>Durée : <span className="font-medium text-digicampus-text-primary">{durationLabel(duration)}</span></span>
                    </div>
                  )}

                  {/* Participants */}
                  <FormField control={form.control} name="participants" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participants</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Récurrence */}
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="recurring"
                        checked={isRecurring}
                        onChange={e => form.setValue("is_recurring", e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="recurring" className="text-sm font-medium">
                        Réservation récurrente
                      </label>
                    </div>

                    {isRecurring && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-digicampus-text-secondary mb-2">Jours de la semaine</p>
                          <div className="flex flex-wrap gap-2">
                            {DAYS.map(d => (
                              <Badge
                                key={d.value}
                                onClick={() => toggleDay(d.value)}
                                className={`cursor-pointer ${
                                  selectedDays.includes(d.value)
                                    ? "bg-digicampus-primary text-white"
                                    : "bg-digicampus-neutral text-digicampus-text-secondary border border-border"
                                }`}
                              >
                                {d.label}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <FormField control={form.control} name="end_date" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dernière date de récurrence</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </div>

                  {error && <p className="text-sm text-digicampus-danger">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
                    disabled={submitting}
                  >
                    {submitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isRecurring ? "Créer les créneaux récurrents" : "Affecter la salle"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Info panel — right column */}
        <div className="space-y-4">
          {/* Récurrence explanation */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-digicampus-primary" />
                Récurrence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-digicampus-text-secondary space-y-2">
              <p>
                Activez la récurrence pour créer automatiquement plusieurs créneaux sur une période donnée.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Choisissez les jours de la semaine</li>
                <li>Définissez la date de fin</li>
                <li>Tous les créneaux sont créés en une seule action</li>
              </ul>
              <p className="text-xs pt-1">
                Utile pour les formations régulières ou les réunions hebdomadaires.
              </p>
            </CardContent>
          </Card>

          {/* Computed duration card — shown when duration is valid */}
          {duration > 0 && (
            <Card className="rounded-xl shadow-sm border-digicampus-primary/20 bg-digicampus-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-digicampus-primary/10 flex items-center justify-center shrink-0">
                  <Timer className="w-5 h-5 text-digicampus-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-digicampus-text-secondary uppercase tracking-wide">Durée calculée</p>
                  <p className="text-xl font-bold text-digicampus-text-primary">{durationLabel(duration)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}
