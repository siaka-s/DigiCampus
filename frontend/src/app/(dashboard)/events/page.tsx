"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock, MapPin, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { eventsApi, CampusEvent, EventType } from "@/lib/api/events"

const TYPE_LABELS: Record<EventType, string> = {
  formation:  "Formation",
  atelier:    "Atelier",
  conference: "Conférence",
  reunion:    "Réunion",
  autre:      "Autre",
}

const TYPE_COLORS: Record<EventType, string> = {
  formation:  "bg-digicampus-secondary/10 text-digicampus-secondary-dark border-digicampus-secondary/20",
  atelier:    "bg-digicampus-primary/10 text-digicampus-primary-dark border-digicampus-primary/20",
  conference: "bg-purple-50 text-purple-700 border-purple-200",
  reunion:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  autre:      "bg-gray-100 text-gray-600 border-gray-200",
}

const FILTERS: { label: string; value: string }[] = [
  { label: "Tous", value: "all" },
  { label: "Formation", value: "formation" },
  { label: "Atelier", value: "atelier" },
  { label: "Conférence", value: "conference" },
  { label: "Réunion", value: "reunion" },
  { label: "Autre", value: "autre" },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function groupByDate(events: CampusEvent[]) {
  const map = new Map<string, CampusEvent[]>()
  for (const e of events) {
    const list = map.get(e.date) ?? []
    list.push(e)
    map.set(e.date, list)
  }
  return map
}

function EventCard({ event }: { event: CampusEvent }) {
  const type = event.type as EventType
  return (
    <div className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-digicampus-text-primary text-sm leading-snug">
          {event.title}
        </h3>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[type]}`}>
          {TYPE_LABELS[type]}
        </span>
      </div>

      {event.description && (
        <p className="text-xs text-digicampus-text-secondary mb-3 line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-digicampus-text-secondary">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-digicampus-text-secondary">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{event.location}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EventsPage() {
  const [events, setEvents]   = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState("all")

  useEffect(() => {
    eventsApi.list().then(r => {
      setEvents(r.data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter)
  const grouped  = groupByDate(filtered)
  const dates    = Array.from(grouped.keys()).sort()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-bold text-digicampus-text-primary">Événements campus</h1>
        <p className="text-sm text-digicampus-text-secondary mt-0.5">
          Les prochains événements organisés sur le campus
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f.value
                ? "bg-digicampus-primary text-white border-digicampus-primary"
                : "bg-white text-digicampus-text-secondary border-border hover:border-digicampus-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center">
            <Calendar className="w-6 h-6 text-digicampus-text-secondary" />
          </div>
          <p className="font-medium text-digicampus-text-primary">Aucun événement à venir</p>
          <p className="text-sm text-digicampus-text-secondary">
            Les prochains événements apparaîtront ici dès leur publication.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-digicampus-text-primary capitalize">
                  <Calendar className="w-4 h-4 text-digicampus-primary" />
                  {formatDate(date)}
                </div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-digicampus-text-secondary">
                  {grouped.get(date)!.length} événement{grouped.get(date)!.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.get(date)!.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
