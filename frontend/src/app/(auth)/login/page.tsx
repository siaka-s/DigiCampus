"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"

const schema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError]           = useState<string | null>(null)
  const [showPassword, setShowPwd]  = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    const result = await signIn("credentials", {
      email:    values.email,
      password: values.password,
      redirect: false,
    })

    if (result?.error === "CredentialsSignin") {
      setError("Email ou mot de passe incorrect")
      return
    }

    if (result?.error) {
      router.push("/pending")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="space-y-7">
      <div className="text-center space-y-1.5">
        <h2 className="text-3xl font-extrabold text-digicampus-text-primary tracking-tight leading-tight">
          Bon retour&nbsp;!
        </h2>
        <p className="text-base text-digicampus-text-secondary leading-relaxed">
          Connectez-vous à votre espace DigiSpace
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                  Adresse email
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="vous@digifemmes.com"
                    className="h-11"
                    {...field}
                  />
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
                <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                  Mot de passe
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-digicampus-text-secondary hover:text-digicampus-text-primary transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-digicampus-danger shrink-0" />
              <p className="text-sm text-digicampus-danger">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-digicampus-primary hover:bg-digicampus-primary-dark text-white font-medium"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : "Se connecter"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-digicampus-text-secondary">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-digicampus-primary hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
