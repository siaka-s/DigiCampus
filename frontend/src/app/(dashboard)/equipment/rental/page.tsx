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
import { Loader2 } from "lucide-react"

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
    setError(null)
    const res = await equipmentApi.createRental({
      type:       "location_externe",
      location:   values.location,
      start_date: values.start_date,
      end_date:   values.end_date,
    })
    setSubmitting(false)
    if (res.error) { setError(res.error); return }
    router.push("/equipment/my-requests")
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-digicampus-text-primary">
        Location externe de matériel IT
      </h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Détails de la location</CardTitle></CardHeader>
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
              <Button type="submit" className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre la demande"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
