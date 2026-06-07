import Link from "next/link"
import { Clock } from "lucide-react"

export default function PendingPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Clock className="w-8 h-8 text-digicampus-warning" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-digicampus-text-primary tracking-tight leading-tight">
            Compte en attente
          </h2>
          <p className="text-base text-digicampus-text-secondary leading-relaxed max-w-xs">
            Votre compte a bien été créé. Un administrateur va l&apos;activer
            prochainement. Vous recevrez un email dès que votre accès est ouvert.
          </p>
        </div>

        <div className="w-full rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
          Validation en cours — merci de patienter
        </div>
      </div>

      <p className="text-center text-sm text-digicampus-text-secondary">
        <Link href="/login" className="text-digicampus-primary hover:underline font-medium">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
