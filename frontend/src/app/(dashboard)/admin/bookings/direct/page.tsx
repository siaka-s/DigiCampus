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
import { Loader2 } from "lucide-react"

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
]

const schema = z.object({
  space_id:     z.string().min(1, "Salle requise"),
  program:      z.string().min(1, "Programme requis"),
  start_time:   z.string().min(1, "Date et heure requises"),
  duration:     z.string(),
  participants: z.string(),
  is_recurring: z.boolean(),
  end_date:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function DirectBookingPage() {
  const router = useRouter()
  const [spaces, setSpaces]         = useState<Space[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)

  useEffect(() => {
    spacesApi.list().then(res => {
      if (res.data) setSpaces(res.data.filter(s => s.IsActive && s.Type === "salle_programme"))
    })
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      space_id: "", program: "", start_time: "",
      duration: "60", participants: "1",
      is_recurring: false, end_date: "",
    },
  })

  const isRecurring = form.watch("is_recurring")

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function onSubmit(values: FormValues) {
    setError(null)
    setSubmitting(true)

    const startDate = new Date(values.start_time)
    const duration  = parseInt(values.duration) || 60
    const participants = parseInt(values.participants) || 1

    if (values.is_recurring) {
      if (selectedDays.length === 0) {
        setError("Sélectionnez au moins un jour")
        setSubmitting(false)
        return
      }
      if (!values.end_date) {
        setError("Date de fin requise pour la récurrence")
        setSubmitting(false)
        return
      }
      const res = await bookingsApi.createRecurring({
        space_id:     values.space_id,
        program:      values.program,
        start_date:   values.start_time.split("T")[0],
        end_date:     values.end_date,
        start_hour:   startDate.getHours(),
        start_minute: startDate.getMinutes(),
        duration,
        participants,
        days_of_week: selectedDays,
      })
      if (res.error) { setError(res.error); setSubmitting(false); return }
    } else {
      const res = await bookingsApi.createDirect({
        space_id:   values.space_id,
        program:    values.program,
        start_time: startDate.toISOString(),
        duration,
        participants,
      })
      if (res.error) { setError(res.error); setSubmitting(false); return }
    }

    setSubmitting(false)
    setSuccess(true)
    setTimeout(() => router.push("/admin/bookings"), 1500)
  }

  if (success) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 text-center space-y-2">
          <p className="text-digicampus-success font-medium">Affectation créée avec succès</p>
          <p className="text-sm text-digicampus-text-secondary">Redirection en cours…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-digicampus-text-primary">
        Affectation directe
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de l&apos;affectation</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField control={form.control} name="space_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Salle</FormLabel>
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Choisir une salle" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {spaces.map(s => (
                        <SelectItem key={s.ID} value={s.ID}>
                          {s.Name} ({s.Capacity} places)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="program" render={({ field }) => (
                <FormItem>
                  <FormLabel>Programme / Intitulé</FormLabel>
                  <FormControl><Input placeholder="Formation, réunion…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date et heure</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (min)</FormLabel>
                    <FormControl><Input type="number" min={30} step={30} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="participants" render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Récurrence */}
              <div className="space-y-3 rounded-lg border border-border p-4">
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
                        <FormLabel>Date de fin</FormLabel>
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
  )
}
