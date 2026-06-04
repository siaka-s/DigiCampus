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
    setError(null)
    const res = await equipmentApi.createRequest({
      type:       "interne",
      mission:    values.mission,
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
        Demande de matériel IT — Mission interne
      </h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Détails de la demande</CardTitle></CardHeader>
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
