"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"

type Slide = {
  id: string
  url?: string
  caption: string
  gradient: string
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: "default-1",
    caption: "Réservez votre salle de programme en quelques clics",
    gradient: "from-[#C2410C] via-[#F97316] to-[#FB923C]",
  },
  {
    id: "default-2",
    caption: "Visualisez l'occupation du campus en temps réel",
    gradient: "from-[#0284C7] via-[#0EA5E9] to-[#38BDF8]",
  },
  {
    id: "default-3",
    caption: "Gérez et validez toutes les demandes de salle depuis un seul endroit",
    gradient: "from-[#1C1917] via-[#57534E] to-[#C2410C]",
  },
]

export function AuthSlideshow() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    fetch(`${apiUrl}/api/v1/photos?active=true`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        clearTimeout(timeout)
        if (Array.isArray(data?.data) && data.data.length > 0) {
          setSlides(
            data.data.map((p: { id: string; filename: string; caption: string }, i: number) => ({
              id: p.id,
              url: `${apiUrl}/uploads/${p.filename}`,
              caption: p.caption,
              gradient: DEFAULT_SLIDES[i % DEFAULT_SLIDES.length].gradient,
            }))
          )
        }
      })
      .catch(() => { clearTimeout(timeout) })
  }, [])

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])

  const slide = slides[current]

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Background slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {slide.url ? (
            <Image src={slide.url} alt={slide.caption} fill className="object-cover" priority />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-10">
        {/* Top branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-tight">DS</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">DigiSpace</p>
            <p className="text-white/60 text-xs mt-0.5">DigiFemmes Côte d&apos;Ivoire</p>
          </div>
        </div>

        {/* Bottom: caption + dots */}
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={`caption-${slide.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-white text-2xl font-semibold leading-snug max-w-xs"
            >
              {slide.caption}
            </motion.p>
          </AnimatePresence>

          <div className="flex gap-2 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-7 bg-white"
                    : "w-1.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
