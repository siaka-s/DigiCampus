import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function PendingPage() {
  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div className="flex justify-center">
          <Clock className="w-12 h-12 text-digicampus-warning" />
        </div>
        <h2 className="text-lg font-semibold text-digicampus-text-primary">
          Compte en attente de validation
        </h2>
        <p className="text-sm text-digicampus-text-secondary">
          Votre compte a bien été créé. Un administrateur va l&apos;activer
          prochainement. Vous recevrez un email dès que votre accès est ouvert.
        </p>
        <Link
          href="/login"
          className="text-sm text-digicampus-primary hover:underline"
        >
          Retour à la connexion
        </Link>
      </CardContent>
    </Card>
  )
}
