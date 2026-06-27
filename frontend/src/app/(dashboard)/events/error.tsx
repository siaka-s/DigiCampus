"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-digicampus-text-secondary">Impossible de charger les événements.</p>
      <button
        onClick={reset}
        className="text-sm text-digicampus-primary hover:underline"
      >
        Réessayer
      </button>
    </div>
  )
}
