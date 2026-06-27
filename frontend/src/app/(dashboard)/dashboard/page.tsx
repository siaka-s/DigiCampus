"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { occupancyApi, type OccupancyItem, type OccupancyBooking } from "@/lib/api/occupancy"
import { bookingsApi, type Booking } from "@/lib/api/bookings"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Users, CalendarPlus, UserCheck, Monitor, TrendingUp, CalendarCheck, Clock, Building2 } from "lucide-react"
import { StatCard } from "@/components/stat-card"


// ─── Constantes ──────────────────────────────────────────────────────────────

const START_HOUR = 7
const END_HOUR   = 20
const HOUR_H     = 64
const GRID_H     = (END_HOUR - START_HOUR) * HOUR_H
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAY_SHORT  = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

// ─── Types ───────────────────────────────────────────────────────────────────

type FlatBooking = OccupancyBooking & {
  room_name: string
  col:       number
  totalCols: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const diff = r.getDay() === 0 ? -6 : 1 - r.getDay()
  r.setDate(r.getDate() + diff)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function fmtWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`
  }
  return `${monday.toLocaleDateString("fr-FR", opts)} – ${sunday.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function fmtEndTime(iso: string, duration: number): string {
  const d = new Date(new Date(iso).getTime() + duration * 60_000)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function fmtResponsible(email: string): string {
  if (!email) return ""
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function bTop(iso: string): number {
  const d = new Date(iso)
  return Math.max((d.getUTCHours() + d.getUTCMinutes() / 60 - START_HOUR) * HOUR_H, 0)
}

function bHeight(duration: number): number {
  return Math.max((duration / 60) * HOUR_H, 28)
}

// ─── Assignation colonnes (gestion des chevauchements) ───────────────────────

function assignColumns(
  bookings: (OccupancyBooking & { room_name: string })[]
): FlatBooking[] {
  if (bookings.length === 0) return []

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const colEnds: number[] = []
  const result: FlatBooking[] = []

  for (const b of sorted) {
    const start = new Date(b.start_time).getTime()
    const end   = start + b.duration * 60_000
    let col = colEnds.findIndex(e => e <= start)
    if (col === -1) col = colEnds.length
    colEnds[col] = end
    result.push({ ...b, col, totalCols: 0 })
  }

  const maxCols = colEnds.length
  for (const r of result) r.totalCols = maxCols
  return result
}

// ─── Composant bloc réservation ───────────────────────────────────────────────

function BookingBlock({ b }: { b: FlatBooking }) {
  const top       = bTop(b.start_time)
  const height    = bHeight(b.duration)
  const confirmed = b.status === "validee"
  const person    = fmtResponsible(b.responsible_email)
  const widthPct  = 100 / b.totalCols
  const leftPct   = (b.col / b.totalCols) * 100

  return (
    <div
      className={`absolute rounded-md overflow-hidden cursor-default select-none border-l-4 shadow-md ${
        confirmed
          ? "bg-[#F97316] border-[#C2410C] hover:bg-[#FB923C]"
          : "bg-[#38BDF8]/25 border-[#38BDF8] hover:bg-[#38BDF8]/35"
      }`}
      style={{
        top:    `${top}px`,
        height: `${height}px`,
        left:   `calc(${leftPct}% + 2px)`,
        width:  `calc(${widthPct}% - 4px)`,
        zIndex: 10 + b.col,
      }}
      title={`${b.room_name} — ${b.program}${person ? ` (${person})` : ""} | ${fmtTime(b.start_time)} – ${fmtEndTime(b.start_time, b.duration)}`}
    >
      <div className="px-1.5 pt-1 pb-0.5 h-full flex flex-col overflow-hidden">
        <p className={`text-[11px] font-semibold leading-tight truncate ${
          confirmed ? "text-white" : "text-[#0284C7]"
        }`}>
          {b.program}
        </p>

        {height >= 44 && (
          <p className={`text-[10px] leading-tight truncate mt-0.5 ${
            confirmed ? "text-white/80" : "text-[#0284C7]/80"
          }`}>
            {b.room_name}
          </p>
        )}

        {height >= 60 && person && (
          <p className={`text-[10px] leading-tight truncate mt-0.5 ${
            confirmed ? "text-white/70" : "text-[#0284C7]/70"
          }`}>
            {person}
          </p>
        )}

        {height >= 76 && (
          <p className={`text-[10px] mt-auto ${
            confirmed ? "text-white/60" : "text-[#0284C7]/60"
          }`}>
            {fmtTime(b.start_time)} – {fmtEndTime(b.start_time, b.duration)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard collaborateur ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",    className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",    className: "bg-digicampus-danger/10 text-digicampus-danger" },
  annulee:    { label: "Annulée",    className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

const MONTHS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
const DAYS_FULL = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]

function todayLabel(d: Date) {
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

// Timeline helpers — 7h à 20h en minutes
const TL_START = 7 * 60
const TL_END   = 20 * 60
const TL_RANGE = TL_END - TL_START

function bookingSegment(b: OccupancyBooking): { left: number; width: number } {
  const start = new Date(b.start_time)
  const startMin = start.getUTCHours() * 60 + start.getUTCMinutes()
  const left  = Math.max(0, ((startMin - TL_START) / TL_RANGE) * 100)
  const width = Math.min(100 - left, (b.duration / TL_RANGE) * 100)
  return { left, width }
}

function nowPercent(now: Date): number | null {
  const min = now.getHours() * 60 + now.getMinutes()
  if (min < TL_START || min > TL_END) return null
  return ((min - TL_START) / TL_RANGE) * 100
}

function isOccupiedNow(bookings: OccupancyBooking[], now: Date): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return bookings.some(b => {
    const s = new Date(b.start_time)
    const sm = s.getUTCHours() * 60 + s.getUTCMinutes()
    return b.status === "validee" && sm <= nowMin && nowMin < sm + b.duration
  })
}

function isPendingNow(bookings: OccupancyBooking[], now: Date): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return bookings.some(b => {
    const s = new Date(b.start_time)
    const sm = s.getUTCHours() * 60 + s.getUTCMinutes()
    return b.status === "en_attente" && sm <= nowMin && nowMin < sm + b.duration
  })
}

function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}h${String(min % 60).padStart(2, "0")}`
}

function roomSubtitle(bookings: OccupancyBooking[], now: Date, occupied: boolean): string {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (occupied) {
    const cur = bookings.find(b => {
      const sm = new Date(b.start_time).getUTCHours() * 60 + new Date(b.start_time).getUTCMinutes()
      return b.status === "validee" && sm <= nowMin && nowMin < sm + b.duration
    })
    if (cur) return `Libre à ${minutesToHHMM(new Date(cur.start_time).getUTCHours() * 60 + new Date(cur.start_time).getUTCMinutes() + cur.duration)}`
  }
  const next = bookings
    .filter(b => b.status === "validee")
    .map(b => ({ sm: new Date(b.start_time).getUTCHours() * 60 + new Date(b.start_time).getUTCMinutes(), b }))
    .filter(({ sm }) => sm > nowMin)
    .sort((a, b) => a.sm - b.sm)[0]
  if (!next) return bookings.length === 0 ? "Libre toute la journée" : "Aucune autre réservation"
  return `Prochaine résa à ${minutesToHHMM(next.sm)}`
}

// ─── Composant carte salle ────────────────────────────────────────────────────

function RoomCard({ room, now }: { room: OccupancyItem; now: Date }) {
  const occupied = isOccupiedNow(room.bookings, now)
  const pending  = !occupied && isPendingNow(room.bookings, now)
  const free     = !occupied && !pending
  const nowPct   = nowPercent(now)
  const subtitle = roomSubtitle(room.bookings, now, occupied)

  const validatedCount = room.bookings.filter(b => b.status === "validee").length
  const pendingCount   = room.bookings.filter(b => b.status === "en_attente").length

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
      occupied ? "border-digicampus-danger/40"
      : pending ? "border-digicampus-warning/40"
      : "border-border"
    }`}>
      {/* En-tête salle */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-digicampus-text-primary text-sm truncate">{room.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-digicampus-text-secondary">{room.capacity} pers. max</span>
            {room.location && <span className="text-[11px] text-digicampus-text-secondary">· {room.location}</span>}
            {validatedCount > 0 && (
              <span className="text-[11px] text-digicampus-text-secondary">
                · {validatedCount} rés{validatedCount > 1 ? "a" : "a"}
                {pendingCount > 0 ? ` + ${pendingCount} en attente` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-[10px] border-0 ${
            occupied ? "bg-digicampus-danger/10 text-digicampus-danger"
            : pending ? "bg-digicampus-warning/10 text-digicampus-warning"
            : "bg-digicampus-success/10 text-digicampus-success"
          }`}>
            {occupied ? "Occupée" : pending ? "En attente" : "Libre"}
          </Badge>
          {free && (
            <Link href="/bookings/new">
              <Button size="sm" variant="outline"
                className="h-7 text-[11px] px-2 text-digicampus-primary border-digicampus-primary/30 hover:bg-digicampus-primary/5">
                Réserver
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Timeline 7h–20h */}
      <div className="relative h-2.5 bg-digicampus-neutral rounded-full overflow-hidden">
        {room.bookings.map((b, i) => {
          const { left, width } = bookingSegment(b)
          if (width <= 0) return null
          return (
            <div
              key={i}
              className={`absolute top-0 h-full rounded-sm ${
                b.status === "validee" ? "bg-digicampus-primary" : "bg-digicampus-warning/60"
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
              title={`${b.program} — ${b.status === "validee" ? "confirmée" : "en attente"}`}
            />
          )
        })}
        {nowPct !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-digicampus-danger z-10"
            style={{ left: `${nowPct}%` }} />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-digicampus-text-secondary mt-1">
        <span>7h</span>
        <span className={occupied ? "text-digicampus-danger" : pending ? "text-digicampus-warning" : "text-digicampus-success"}>
          {subtitle}
        </span>
        <span>20h</span>
      </div>
    </div>
  )
}

// ─── Prochaines réservations ──────────────────────────────────────────────────

function UpcomingBookings({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-digicampus-text-primary">Mes prochaines réservations</p>
        <Link href="/bookings" className="text-xs text-digicampus-primary hover:underline">Tout voir</Link>
      </div>
      {bookings.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-center px-4">
          <CalendarCheck className="w-7 h-7 text-digicampus-text-secondary opacity-40" />
          <p className="text-xs text-digicampus-text-secondary">Aucune réservation à venir</p>
          <Link href="/bookings/new"
            className="text-xs text-digicampus-primary hover:underline font-medium">
            Faire une demande →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bookings.map(b => {
            const s    = STATUS_CONFIG[b.Status] ?? { label: b.Status, className: "" }
            const d    = new Date(b.StartTime)
            const date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
            const time = `${String(d.getUTCHours()).padStart(2, "0")}h${String(d.getUTCMinutes()).padStart(2, "0")}`
            return (
              <div key={b.ID} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-digicampus-text-primary truncate">{b.Program}</p>
                  <p className="text-[11px] text-digicampus-text-secondary mt-0.5">
                    {date} · {time} · {b.Duration} min
                  </p>
                </div>
                <Badge className={`${s.className} text-[10px] shrink-0`}>{s.label}</Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CollaborateurDashboard ───────────────────────────────────────────────────

function CollaborateurDashboard() {
  const { data: session } = useSession()
  const [today]           = useState(() => new Date())
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const [bookings,        setBookings]        = useState<Booking[]>([])
  const [rooms,           setRooms]           = useState<OccupancyItem[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingRooms,    setLoadingRooms]    = useState(true)
  const [now,             setNow]             = useState(() => new Date())

  useEffect(() => {
    bookingsApi.list().then(res => {
      if (res.data) setBookings(res.data)
      setLoadingBookings(false)
    })
    occupancyApi.get(todayStr).then(res => {
      if (res.data) setRooms(res.data.filter(r => r.type === "salle_programme"))
      setLoadingRooms(false)
    })
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [todayStr])

  const prenom = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "vous"

  const freeCount     = rooms.filter(r => !isOccupiedNow(r.bookings, now) && !isPendingNow(r.bookings, now)).length
  const occupiedCount = rooms.filter(r => isOccupiedNow(r.bookings, now)).length
  const pendingCount  = rooms.filter(r => !isOccupiedNow(r.bookings, now) && isPendingNow(r.bookings, now)).length

  const upcomingBookings = bookings
    .filter(b => new Date(b.StartTime) > now && b.Status !== "annulee" && b.Status !== "refusee")
    .sort((a, b) => new Date(a.StartTime).getTime() - new Date(b.StartTime).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Bonjour, {prenom} 👋</h1>
          <p className="text-sm text-digicampus-text-secondary mt-0.5">{todayLabel(today)}</p>
        </div>
        {!loadingRooms && rooms.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-digicampus-success/10 text-digicampus-success rounded-lg px-3 py-1.5 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-digicampus-success" />
              {freeCount} libre{freeCount > 1 ? "s" : ""}
            </div>
            {occupiedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-digicampus-danger/10 text-digicampus-danger rounded-lg px-3 py-1.5 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-digicampus-danger" />
                {occupiedCount} occupée{occupiedCount > 1 ? "s" : ""}
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-digicampus-warning/10 text-digicampus-warning rounded-lg px-3 py-1.5 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-digicampus-warning" />
                {pendingCount} en attente
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Grille principale ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Salles — 3/5 */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-[11px] font-semibold text-digicampus-text-secondary uppercase tracking-widest">
            Salles de formation — aujourd&apos;hui
          </p>

          {loadingRooms ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-10 text-center">
              <Building2 className="w-8 h-8 text-digicampus-text-secondary mx-auto mb-2 opacity-30" />
              <p className="text-sm text-digicampus-text-secondary">Aucune salle de formation disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms
                .sort((a, b) => {
                  const ao = isOccupiedNow(a.bookings, now) ? 1 : 0
                  const bo = isOccupiedNow(b.bookings, now) ? 1 : 0
                  return ao - bo
                })
                .map(r => <RoomCard key={r.id} room={r} now={now} />)}
            </div>
          )}

          {/* Légende */}
          {!loadingRooms && rooms.length > 0 && (
            <div className="flex gap-4 text-[11px] text-digicampus-text-secondary pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-digicampus-primary inline-block" />Réservation confirmée
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-digicampus-warning/60 inline-block" />En attente de validation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-0.5 h-3 bg-digicampus-danger inline-block" />Maintenant
              </span>
            </div>
          )}
        </div>

        {/* Panneau droit — 2/5 */}
        <div className="lg:col-span-2 space-y-4">

          {/* Actions rapides */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "/bookings/new", icon: CalendarPlus, label: "Réserver une salle",    bg: "bg-digicampus-primary/10",  hover: "group-hover:bg-digicampus-primary/20",  icon_class: "text-digicampus-primary" },
              { href: "/presence",     icon: UserCheck,    label: "Déclarer ma présence",  bg: "bg-digicampus-secondary/10",hover: "group-hover:bg-digicampus-secondary/20",icon_class: "text-digicampus-secondary-dark" },
              { href: "/equipment/my-requests", icon: Monitor, label: "Mes demandes IT",  bg: "bg-digicampus-neutral border border-border", hover: "group-hover:border-digicampus-primary/30", icon_class: "text-digicampus-text-secondary" },
            ].map(({ href, icon: Icon, label, bg, hover, icon_class }) => (
              <Link key={href} href={href}>
                <div className="bg-white rounded-xl border border-border shadow-sm p-3 flex flex-col items-center gap-2 hover:shadow-md transition-all cursor-pointer group text-center">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${hover} transition-colors`}>
                    <Icon className={`w-4 h-4 ${icon_class}`} />
                  </div>
                  <p className="text-[11px] font-medium text-digicampus-text-primary leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Prochaines réservations */}
          <UpcomingBookings bookings={upcomingBookings} loading={loadingBookings} />
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ""
  const isAdmin = role === "admin" || role === "super_admin"

  if (status === "loading") return <Skeleton className="h-80 w-full" />
  if (!isAdmin) return <CollaborateurDashboard />
  return <AdminDashboard />
}

function AdminDashboard() {
  const today  = new Date(); today.setHours(0, 0, 0, 0)

  const [monday, setMonday]     = useState(() => getMonday(today))
  const [weekData, setWeekData] = useState<OccupancyItem[][]>([])
  const [loading, setLoading]   = useState(true)
  const [nowY, setNowY]         = useState<number | null>(null)

  const mondayStr = toYMD(monday)
  const isCurrentWeek = isSameDay(monday, getMonday(today))

  const load = useCallback(async () => {
    setLoading(true)
    const data = await occupancyApi.getWeek(mondayStr)
    setWeekData(data)
    setLoading(false)
  }, [mondayStr])

  useEffect(() => { load() }, [load])

  // Indicateur heure courante
  useEffect(() => {
    function tick() {
      const n = new Date()
      const h = n.getUTCHours() + n.getUTCMinutes() / 60
      setNowY(h >= START_HOUR && h < END_HOUR ? (h - START_HOUR) * HOUR_H : null)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Colonnes jours (Lun=0 … Dim=6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  // Aplatir les réservations par jour (salles de programme uniquement)
  const flatByDay: FlatBooking[][] = weekData.map(dayRooms => {
    const all = (dayRooms ?? [])
      .filter(r => r.type === "salle_programme")
      .flatMap(r => (r.bookings ?? []).map(b => ({ ...b, room_name: r.name })))
    return assignColumns(all)
  })

  // Bureaux du jour courant (aujourd'hui si dans la semaine affichée, sinon lundi)
  const todayIdx = isCurrentWeek ? days.findIndex(d => isSameDay(d, today)) : 0
  const bureaux  = (weekData[todayIdx] ?? []).filter(r => r.type !== "salle_programme")

  // Taux d'occupation semaine
  const sallesSet = weekData[0]?.filter(r => r.type === "salle_programme") ?? []
  const total     = sallesSet.length * 7
  const occupied  = weekData.reduce((acc, day) =>
    acc + (day ?? []).filter(r => r.type === "salle_programme" && r.bookings?.some(b => b.status === "validee")).length, 0)
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0

  function prevWeek() { setMonday(m => addDays(m, -7)) }
  function nextWeek() { setMonday(m => addDays(m, 7)) }
  function goToday()  { setMonday(getMonday(today)) }

  // KPI stats
  const validatedCount = weekData.flat().flatMap(r => r.bookings ?? []).filter(b => b.status === "validee").length
  const pendingCount   = weekData.flat().flatMap(r => r.bookings ?? []).filter(b => b.status === "en_attente").length
  const activeOffices  = (weekData[0] ?? []).filter(r => r.type !== "salle_programme").length

  return (
    <div className="space-y-4 h-full">

      {/* ── Stat cards KPI ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Occupation semaine"
            value={`${rate}%`}
            icon={TrendingUp}
            trend={rate >= 70 ? "up" : rate >= 40 ? "neutral" : "down"}
            trendLabel="Des salles sont occupées"
          />
          <StatCard
            label="Réservations validées"
            value={validatedCount}
            icon={CalendarCheck}
            iconColor="text-digicampus-success"
            trendLabel="Cette semaine"
          />
          <StatCard
            label="En attente"
            value={pendingCount}
            icon={Clock}
            trend="neutral"
            trendLabel="À valider"
          />
          <StatCard
            label="Bureaux actifs"
            value={activeOffices}
            icon={Building2}
            subtitle="Bureaux du campus"
          />
        </div>
      )}

      {/* ── Barre de navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="text-digicampus-primary border-digicampus-primary/40 hover:bg-digicampus-primary/5 h-8 text-xs"
            >
              Aujourd&apos;hui
            </Button>
          )}

          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <span className="text-sm font-medium text-digicampus-text-primary capitalize">
            {fmtWeekRange(monday)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-digicampus-text-secondary bg-white rounded-lg border border-border px-3 py-1.5">
            <span>Occupation</span>
            <Badge className={
              rate >= 80 ? "bg-digicampus-danger/10 text-digicampus-danger text-[11px]"
              : rate >= 50 ? "bg-digicampus-warning/10 text-digicampus-warning text-[11px]"
              : "bg-digicampus-success/10 text-digicampus-success text-[11px]"
            }>{rate}%</Badge>
          </div>
        </div>
      </div>

      {/* ── Grille semaine ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">

        {/* En-têtes des jours — sticky */}
        <div className="flex border-b border-border">
          {/* Espace heures */}
          <div className="w-14 shrink-0 border-r border-border/50" />

          {days.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const dayName = DAY_SHORT[day.getDay()]
            return (
              <div
                key={idx}
                className={`flex-1 flex flex-col items-center py-2.5 border-l border-border/50 first:border-l-0 ${
                  isToday ? "bg-digicampus-primary/5" : ""
                }`}
              >
                <span className={`text-[11px] font-medium uppercase tracking-wider ${
                  isToday ? "text-digicampus-primary" : "text-digicampus-text-secondary"
                }`}>
                  {dayName}
                </span>
                <span className={`mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  isToday
                    ? "bg-digicampus-primary text-white"
                    : "text-digicampus-text-primary"
                }`}>
                  {day.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Corps scrollable */}
        {loading ? (
          <Skeleton className="h-80 w-full rounded-none" />
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: "520px" }}>
            <div className="flex" style={{ minWidth: "700px" }}>

              {/* Colonne heures */}
              <div
                className="w-14 shrink-0 relative border-r border-border/50"
                style={{ height: `${GRID_H}px` }}
              >
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute right-2 flex items-start"
                    style={{ top: `${(h - START_HOUR) * HOUR_H - 8}px`, height: `${HOUR_H}px` }}
                  >
                    <span className="text-[11px] text-digicampus-text-secondary font-medium">
                      {String(h).padStart(2, "0")}h
                    </span>
                  </div>
                ))}
              </div>

              {/* Colonnes des 7 jours */}
              {days.map((day, idx) => {
                const isToday  = isSameDay(day, today)
                const dayBooks = flatByDay[idx] ?? []

                return (
                  <div
                    key={idx}
                    className={`flex-1 relative border-l border-border/50 ${
                      isToday ? "bg-digicampus-primary/[0.02]" : ""
                    }`}
                    style={{ height: `${GRID_H}px` }}
                  >
                    {/* Lignes heures */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-border/30"
                        style={{ top: `${(h - START_HOUR) * HOUR_H}px` }}
                      />
                    ))}
                    {/* Demi-heures */}
                    {HOURS.map(h => (
                      <div
                        key={`h-${h}`}
                        className="absolute inset-x-0 border-t border-border/15"
                        style={{ top: `${(h - START_HOUR) * HOUR_H + HOUR_H / 2}px` }}
                      />
                    ))}

                    {/* Indicateur heure courante */}
                    {isToday && nowY !== null && (
                      <div
                        className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                        style={{ top: `${nowY}px` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-digicampus-danger shrink-0 -ml-1" />
                        <div className="flex-1 h-px bg-digicampus-danger opacity-70" style={{ backgroundImage: "repeating-linear-gradient(to right, #DC2626 0, #DC2626 4px, transparent 4px, transparent 8px)" }} />
                      </div>
                    )}

                    {/* Blocs de réservation */}
                    {dayBooks.map(b => (
                      <BookingBlock key={b.id} b={b} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bureaux ──────────────────────────────────────────────────────── */}
      {bureaux.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-digicampus-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" />
            Bureaux — {isCurrentWeek ? "aujourd'hui" : days[0].toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {bureaux.map(b => {
              const isOver = b.is_over_capacity
              const isFull = b.seats > 0 && b.presence_count >= b.seats && !isOver
              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border p-3.5 ${
                    isOver ? "border-digicampus-danger"
                    : isFull ? "border-digicampus-warning"
                    : "border-border"
                  }`}
                >
                  <p className="font-medium text-digicampus-text-primary text-sm truncate">{b.name}</p>
                  {b.type === "bureau_partage" && b.seats > 0 ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-digicampus-text-secondary">
                        {b.presence_count}/{b.seats}
                      </span>
                      <Badge className={`text-[10px] ${
                        isOver ? "bg-digicampus-danger/10 text-digicampus-danger"
                        : isFull ? "bg-digicampus-warning/10 text-digicampus-warning"
                        : "bg-digicampus-success/10 text-digicampus-success"
                      }`}>
                        {isOver ? "Suroccupé" : isFull ? "Complet" : "Disponible"}
                      </Badge>
                    </div>
                  ) : (
                    <Badge className="mt-1.5 bg-digicampus-secondary/10 text-digicampus-secondary-dark text-[10px]">
                      Individuel
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Légende ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs text-digicampus-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-l-4 border-[#C2410C] bg-[#F97316] shrink-0" />
          Confirmée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-l-4 border-[#38BDF8] bg-[#38BDF8]/25 shrink-0" />
          En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-digicampus-danger shrink-0" />
            <span className="w-5 h-px bg-digicampus-danger" />
          </span>
          Heure actuelle
        </span>
      </div>
    </div>
  )
}
