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
import { Loader2, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  location:   z.string().min(1, "Lieu / client requis"),
  start_date: z.string().min(1, "Date de début requise"),
  end_date:   z.string().min(1, "Date de fin requise"),
})

type FormValues = z.infer<typeof schema>

export default function EquipmentRentalPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location: "", start_date: "", end_date: "" },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    const res = await equipmentApi.createRental({
      type:       "location_externe",
      location:   values.location,
      start_date: values.start_date,
      end_date:   values.end_date,
    })
    setSubmitting(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Demande de location envoyée")
    router.push("/equipment/my-requests")
  }

  const steps = [
    "Soumission de la demande",
    "Validation admin IT",
    "Attribution du matériel",
    "Clôture à la date de retour",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-digicampus-text-primary">
          Location externe de matériel IT
        </h1>
        <p className="text-sm text-digicampus-text-secondary mt-1">
          Soumettez une demande de location pour un client ou partenaire externe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-border bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-digicampus-text-primary">
                Détails de la location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client / Lieu de location</FormLabel>
                      <FormControl><Input placeholder="Nom du client, adresse…" {...field} /></FormControl>
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
                        <FormLabel>Date de retour</FormLabel>
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
          <Card className="rounded-xl border border-digicampus-warning/30 bg-digicampus-warning/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-digicampus-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-digicampus-warning" />
                </div>
                <CardTitle className="text-sm font-semibold text-digicampus-text-primary">Important</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-digicampus-text-secondary space-y-2">
              <p>La location doit être <span className="font-medium text-digicampus-text-primary">validée par l&apos;admin IT</span> avant attribution du matériel.</p>
              <p>Le matériel doit être retourné à la date indiquée.</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-digicampus-text-primary">Processus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-medium ${
                    i < steps.length - 1 ? "bg-digicampus-primary" : "bg-digicampus-text-secondary/40"
                  }`}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-digicampus-text-secondary">{step}</p>
                  {i < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-digicampus-text-secondary/30 ml-auto shrink-0" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
