"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  confirmPassword: z.string(),
  website: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const loadedAt = useRef(new Date().toISOString())

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "", website: "" },
  })

  async function onSubmit(values: FormValues) {
    setError(null)

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Submitted-At": loadedAt.current,
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          website: values.website,
        }),
      }
    )

    if (res.status === 409) {
      setError("Cet email est déjà utilisé")
      return
    }

    if (!res.ok) {
      setError("Une erreur est survenue, réessayez")
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/pending"), 2000)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-digicampus-success font-medium">Compte créé avec succès</p>
          <p className="text-sm text-digicampus-text-secondary">
            Votre compte est en attente de validation par un administrateur.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Rejoignez l&apos;espace DigiCampus</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Honeypot — caché visuellement */}
            <input
              type="text"
              {...form.register("website")}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vous@digifemmes.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="8 caractères minimum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmer le mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-digicampus-danger">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Créer mon compte"
              )}
            </Button>

            <p className="text-center text-sm text-digicampus-text-secondary">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-digicampus-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
