"use client"

import { useEffect, useState } from "react"
import { usersApi, type User } from "@/lib/api/users"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

const ROLES = [
  { value: "super_admin",              label: "Super Admin" },
  { value: "admin",                    label: "Admin" },
  { value: "admin_it",                 label: "Admin IT" },
  { value: "collaborateur_digifemmes", label: "Collaborateur DigiFemmes" },
  { value: "collaborateur_partenaire", label: "Collaborateur Partenaire" },
]

const roleLabel = (role: string) =>
  ROLES.find((r) => r.value === role)?.label ?? role

export default function UsersPage() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [editing, setEditing]       = useState<User | null>(null)
  const [editRole, setEditRole]     = useState("")
  const [editDept, setEditDept]     = useState("")
  const [saving, setSaving]         = useState(false)

  async function loadUsers() {
    setLoading(true)
    const res = await usersApi.list()
    if (res.data) setUsers(res.data)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  function openEdit(user: User) {
    setEditing(user)
    setEditRole(user.Role)
    setEditDept(user.Department ?? "")
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await usersApi.updateRole(editing.ID, editRole)
    await usersApi.updateDepartment(editing.ID, editDept || null)
    setSaving(false)
    setEditing(null)
    loadUsers()
  }

  async function toggleActive(user: User) {
    if (user.IsActive) {
      await usersApi.deactivate(user.ID)
    } else {
      await usersApi.activate(user.ID)
    }
    loadUsers()
  }

  const filtered = users.filter((u) => {
    if (filterRole !== "all" && u.Role !== filterRole) return false
    if (filterStatus === "active" && !u.IsActive) return false
    if (filterStatus === "inactive" && u.IsActive) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-digicampus-text-primary">
          Gestion des utilisateurs
        </h1>
        <span className="text-sm text-digicampus-text-secondary">
          {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-digicampus-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-digicampus-text-secondary">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.ID}>
                    <TableCell className="font-medium">{user.Email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabel(user.Role)}</Badge>
                    </TableCell>
                    <TableCell className="text-digicampus-text-secondary">
                      {user.Department ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.IsActive
                            ? "bg-digicampus-success/10 text-digicampus-success"
                            : "bg-digicampus-warning/10 text-digicampus-warning"
                        }
                      >
                        {user.IsActive ? "Actif" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(user)}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant={user.IsActive ? "destructive" : "default"}
                          className={
                            !user.IsActive
                              ? "bg-digicampus-success hover:bg-digicampus-success/90 text-white"
                              : ""
                          }
                          onClick={() => toggleActive(user)}
                        >
                          {user.IsActive ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog édition */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Département</Label>
              <Input
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                placeholder="Ex: Formation, Tech, Communication…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
