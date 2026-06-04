export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-digicampus-neutral flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-digicampus-text-primary">
            DigiCampus
          </h1>
          <p className="text-digicampus-text-secondary text-sm mt-1">
            DigiFemmes Côte d&apos;Ivoire
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
