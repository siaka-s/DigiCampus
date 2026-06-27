"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { equipmentApi } from "@/lib/api/equipment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Monitor, Clock } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  mission:    z.string().min(1, "Mission requise"),
  start_date: z.string().min(1, "Date de début requise"),
  end_date:   z.string().min(1, "Date de fin requise"),
})

type FormValues = z.infer<typeof schema>

export default function EquipmentRequestPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mission: "", start_date: "", end_date: "" },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    const res = await equipmentApi.createRequest({
      type:       "interne",
      mission:    values.mission,
      start_date: values.start_date,
      end_date:   values.end_date,
    })
    setSubmitting(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Demande de matériel envoyée")
    router.push("/equipment/my-requests")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">
          Demande de matériel IT — Mission interne
        </h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Demandez du matériel pour une mission ou formation interne
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-border bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-digicampus-text-primary">
                Détails de la demande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="mission" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intitulé de la mission</FormLabel>
                      <FormControl><Input placeholder="Formation React, Atelier…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  {error && <p className="text-sm text-digicampus-danger">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white rounded-xl"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre la demande"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-xl border border-digicampus-secondary/30 bg-digicampus-secondary/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-digicampus-secondary/20 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-digicampus-secondary-dark" />
                </div>
                <CardTitle className="text-sm font-semibold text-digicampus-secondary-dark">
                  Matériel disponible
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-digicampus-text-secondary space-y-1.5">
              <p>• MacBook Pro 14"</p>
              <p>• Dell XPS 15</p>
              <p>• Projecteurs portables</p>
              <p className="pt-1 text-xs">L&apos;attribution du matériel spécifique est faite par l&apos;admin IT.</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-digicampus-neutral flex items-center justify-center">
                  <Clock className="w-4 h-4 text-digicampus-text-secondary" />
                </div>
                <CardTitle className="text-sm font-semibold text-digicampus-text-primary">Traitement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-digicampus-text-secondary space-y-2">
              <p>Délai de traitement habituel : <span className="font-medium text-digicampus-text-primary">1 à 2 jours ouvrés</span></p>
              <p>Vous recevrez un email de confirmation à la validation.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
