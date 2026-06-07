import { AuthSlideshow } from "@/components/auth-slideshow"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 bg-white">
        <div className="mx-auto w-full max-w-sm py-8 lg:py-12">
          {/* Logo */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-digicampus-primary flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm tracking-tight">DC</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-digicampus-text-primary">DigiCampus</span>
            </div>
            <p className="text-sm text-digicampus-text-secondary tracking-wide">
              DigiFemmes Côte d&apos;Ivoire
            </p>
          </div>

          {children}
        </div>
      </div>

      {/* Right — Slideshow (visible à partir de lg) */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[58%] relative">
        <AuthSlideshow />
      </div>
    </div>
  )
}
