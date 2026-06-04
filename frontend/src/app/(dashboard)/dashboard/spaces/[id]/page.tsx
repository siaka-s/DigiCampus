"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SpaceWeeklyPage() {
  const { id } = useParams()

  return (
    <div className="space-y-4">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </Link>
      <div className="bg-white rounded-lg border border-border p-8 text-center text-digicampus-text-secondary">
        <p className="font-medium">Vue hebdomadaire</p>
        <p className="text-sm mt-1">Disponible à l&apos;Étape 6 — Réservations</p>
        <p className="text-xs mt-2 opacity-50">Espace ID : {id}</p>
      </div>
    </div>
  )
}
