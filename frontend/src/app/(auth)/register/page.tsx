"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { departmentsApi, type Department } from "@/lib/api/departments"

const CATEGORY_LABELS: Record<string, string> = {
  interne:    "DigiFemmes",
  externe:    "Externe",
  partenaire: "Partenaire",
}

const schema = z.object({
  email:           z.string().email("Email invalide"),
  password:        z.string().min(8, "8 caractères minimum"),
  confirmPassword: z.string(),
  department:      z.string().min(1, "Veuillez sélectionner votre profil"),
  website:         z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router    = useRouter()
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const loadedAt = useRef(new Date().toISOString())

  useEffect(() => {
    departmentsApi.listActive().then(setDepartments)
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "", department: "", website: "" },
  })

  // Grouper les départements par catégorie
  const grouped = departments.reduce<Record<string, Department[]>>((acc, d) => {
    acc[d.category] = acc[d.category] ?? []
    acc[d.category].push(d)
    return acc
  }, {})

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
          email:      values.email,
          password:   values.password,
          department: values.department,
          website:    values.website,
        }),
      }
    )

    if (res.status === 409) { setError("Cet email est déjà utilisé"); return }
    if (!res.ok)            { setError("Une erreur est survenue, réessayez"); return }

    setSuccess(true)
    setTimeout(() => router.push("/pending"), 2500)
  }

  if (success) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-digicampus-success" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-digicampus-text-primary">Compte créé avec succès</p>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            Un administrateur va activer votre accès prochainement.
          </p>
        </div>
        <p className="text-xs text-digicampus-text-secondary">Redirection en cours…</p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="text-center space-y-1.5">
        <h2 className="text-3xl font-extrabold text-digicampus-text-primary tracking-tight leading-tight">
          Créer un compte
        </h2>
        <p className="text-base text-digicampus-text-secondary leading-relaxed">
          Rejoignez l&apos;espace DigiSpace DigiFemmes
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Honeypot */}
          <input
            type="text"
            {...form.register("website")}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                Adresse email
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="vous@exemple.com" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Département / Profil */}
          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                Département / Profil
              </FormLabel>
              <Select value={field.value} onValueChange={v => field.onChange(v ?? "")}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sélectionnez votre profil" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(grouped).map(([category, depts]) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-xs text-digicampus-text-secondary">
                        {CATEGORY_LABELS[category] ?? category}
                      </SelectLabel>
                      {depts.map(d => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                Mot de passe
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    placeholder="8 caractères minimum"
                    className="h-11 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-digicampus-text-secondary hover:text-digicampus-text-primary transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-digicampus-text-primary">
                Confirmer le mot de passe
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-digicampus-text-secondary hover:text-digicampus-text-primary transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

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
              : "Créer mon compte"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-digicampus-text-secondary">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-digicampus-primary hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
