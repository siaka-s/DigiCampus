"use client"

import { useEffect, useState } from "react"
import { equipmentApi, type EquipmentRequest } from "@/lib/api/equipment"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Monitor, Package, Plus, Search } from "lucide-react"
import Link from "next/link"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-digicampus-warning/10 text-digicampus-warning" },
  validee:    { label: "Validée",    className: "bg-digicampus-success/10 text-digicampus-success" },
  refusee:    { label: "Refusée",    className: "bg-digicampus-danger/10 text-digicampus-danger" },
  cloturee:   { label: "Clôturée",   className: "bg-digicampus-text-secondary/10 text-digicampus-text-secondary" },
}

const TYPE_LABELS: Record<string, string> = {
  interne:          "Mission interne",
  location_externe: "Location externe",
}

const FILTERS = [
  { value: "all",        label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "validee",    label: "Validées" },
  { value: "refusee",    label: "Refusées" },
  { value: "cloturee",   label: "Clôturées" },
]

export default function MyEquipmentRequestsPage() {
  const [requests, setRequests] = useState<EquipmentRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState("all")
  const [search, setSearch]     = useState("")

  useEffect(() => {
    equipmentApi.listRequests().then(res => {
      if (res.data) setRequests(res.data)
      setLoading(false)
    })
  }, [])

  const pending  = requests.filter(r => r.Status === "en_attente").length

  const filtered = requests
    .filter(r => filter === "all" || r.Status === filter)
    .filter(r => {
      if (!search) return true
      const q = search.toLowerCase()
      return (r.Mission ?? "").toLowerCase().includes(q) || (r.Location ?? "").toLowerCase().includes(q)
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-digicampus-text-primary">Mes demandes IT</h1>
          <p className="text-sm text-digicampus-text-secondary mt-1">
            {pending > 0
              ? `${pending} demande${pending > 1 ? "s" : ""} en attente de validation`
              : "Historique de vos demandes de matériel"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/equipment/request">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Monitor className="w-4 h-4" />
              Mission interne
            </Button>
          </Link>
          <Link href="/equipment/rental">
            <Button size="sm" className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white gap-1.5">
              <Package className="w-4 h-4" />
              Location externe
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-80" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-digicampus-text-secondary" />
              <Input
                placeholder="Rechercher par mission ou client…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-1 bg-digicampus-neutral rounded-xl p-1">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors relative ${
                    filter === f.value
                      ? "bg-white text-digicampus-text-primary shadow-sm"
                      : "text-digicampus-text-secondary hover:text-digicampus-text-primary"
                  }`}
                >
                  {f.label}
                  {f.value === "en_attente" && pending > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-digicampus-warning text-white text-xs font-semibold">
                      {pending}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-4 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-digicampus-neutral flex items-center justify-center">
                <Monitor className="w-6 h-6 text-digicampus-text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-digicampus-text-primary">Aucune demande</p>
                <p className="text-xs text-digicampus-text-secondary mt-1">
                  {search || filter !== "all"
                    ? "Essayez d'ajuster vos filtres."
                    : "Vous n'avez pas encore fait de demande de matériel."}
                </p>
              </div>
              {!search && filter === "all" && (
                <div className="flex gap-2">
                  <Link href="/equipment/request">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Mission interne
                    </Button>
                  </Link>
                  <Link href="/equipment/rental">
                    <Button size="sm" className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Location externe
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Mission / Client</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => {
                  const s     = STATUS_CONFIG[req.Status] ?? { label: req.Status, className: "" }
                  const start = new Date(req.StartDate).toLocaleDateString("fr-FR")
                  const end   = new Date(req.EndDate).toLocaleDateString("fr-FR")
                  return (
                    <TableRow key={req.ID}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_LABELS[req.Type] ?? req.Type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">
                        {req.Mission ?? req.Location ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-digicampus-text-secondary">
                        {start} → {end}
                      </TableCell>
                      <TableCell>
                        <Badge className={s.className}>{s.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
