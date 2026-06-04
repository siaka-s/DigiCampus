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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Search } from "lucide-react"

const schema = z.object({
  program:      z.string().min(1, "Nom du programme requis"),
  start_time:   z.string().min(1, "Date et heure requises"),
  duration:     z.string(),
  participants: z.string(),
})

type FormValues = z.infer<typeof schema>

export default function NewBookingPage() {
  const router = useRouter()
  const [availableSpaces, setAvailableSpaces] = useState<Space[] | null>(null)
  const [selectedSpace, setSelectedSpace]     = useState<Space | null>(null)
  const [searching, setSearching]             = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [isUrgent, setIsUrgent]               = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { program: "", start_time: "", duration: "60", participants: "1" },
  })

  async function searchSpaces() {
    setSearching(true)
    setSelectedSpace(null)
    setError(null)
    const { start_time, duration, participants } = form.getValues()
    const res = await spacesApi.available(
      new Date(start_time).toISOString(),
      parseInt(duration) || 60,
      parseInt(participants) || 1,
    )
    setAvailableSpaces(res.data ?? [])
    setSearching(false)
  }

  async function onSubmit(values: FormValues) {
    if (!selectedSpace) {
      setError("Veuillez sélectionner une salle")
      return
    }
    setSubmitting(true)
    setError(null)
    const payload = {
      space_id:     selectedSpace.ID,
      program:      values.program,
      start_time:   new Date(values.start_time).toISOString(),
      duration:     parseInt(values.duration) || 60,
      participants: parseInt(values.participants) || 1,
    }
    const fn = isUrgent ? bookingsApi.createUrgent : bookingsApi.create
    const res = await fn(payload)
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    router.push("/bookings")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-digicampus-text-primary">
        Nouvelle demande de salle
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la demande</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="program" render={({ field }) => (
                <FormItem>
                  <FormLabel>Programme / Intitulé</FormLabel>
                  <FormControl><Input placeholder="Formation React, Réunion équipe…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date et heure de début</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (minutes)</FormLabel>
                    <FormControl><Input type="number" min={30} step={30} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="participants" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de participants</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

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

              <Button
                type="button"
                variant="outline"
                onClick={searchSpaces}
                disabled={searching}
                className="w-full"
              >
                {searching
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Search className="w-4 h-4 mr-2" />}
                Rechercher les salles disponibles
              </Button>

              {/* Liste des salles disponibles */}
              {availableSpaces !== null && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-digicampus-text-primary">
                    {availableSpaces.length === 0
                      ? "Aucune salle disponible sur ce créneau"
                      : `${availableSpaces.length} salle(s) disponible(s)`}
                  </p>
                  {availableSpaces.map(s => (
                    <div
                      key={s.ID}
                      onClick={() => setSelectedSpace(s)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSpace?.ID === s.ID
                          ? "border-digicampus-primary bg-digicampus-primary/5"
                          : "border-border hover:border-digicampus-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{s.Name}</span>
                        <Badge variant="secondary">{s.Capacity} places</Badge>
                      </div>
                      {s.EquipmentFixed?.length > 0 && (
                        <p className="text-xs text-digicampus-text-secondary mt-1">
                          {s.EquipmentFixed.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-digicampus-danger">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
                disabled={submitting || !selectedSpace}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre la demande"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
