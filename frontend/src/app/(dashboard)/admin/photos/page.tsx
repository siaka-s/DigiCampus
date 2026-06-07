"use client"

import { useEffect, useRef, useState } from "react"
import { photosApi, type CampusPhoto } from "@/lib/api/photos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Upload, Trash2, Eye, EyeOff, Loader2, ImageIcon, Save,
} from "lucide-react"
import { toast } from "sonner"

const MAX_SIZE_MB = 5

export default function PhotosPage() {
  const [photos, setPhotos]       = useState<CampusPhoto[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption]     = useState("")
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CampusPhoto | null>(null)
  const [captions, setCaptions]   = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await photosApi.list()
    if (res.data) {
      setPhotos(res.data)
      const c: Record<string, string> = {}
      res.data.forEach(p => { c[p.id] = p.caption })
      setCaptions(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Fichier trop lourd (max ${MAX_SIZE_MB} Mo)`)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file) { toast.error("Sélectionnez une image"); return }
    setUploading(true)
    try {
      const res = await photosApi.upload(file, caption)
      if (res.error) { toast.error(res.error); return }
      toast.success("Photo ajoutée")
      setFile(null)
      setPreview(null)
      setCaption("")
      if (fileRef.current) fileRef.current.value = ""
      load()
    } catch {
      toast.error("Impossible de joindre le serveur")
    } finally {
      setUploading(false)
    }
  }

  async function toggleActive(photo: CampusPhoto) {
    await photosApi.update(photo.id, {
      caption:     captions[photo.id] ?? photo.caption,
      is_active:   !photo.is_active,
      order_index: photo.order_index,
    })
    load()
  }

  async function saveCaption(photo: CampusPhoto) {
    await photosApi.update(photo.id, {
      caption:     captions[photo.id] ?? photo.caption,
      is_active:   photo.is_active,
      order_index: photo.order_index,
    })
    toast.success("Légende enregistrée")
    load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await photosApi.delete(deleteTarget.id)
    toast.success("Photo supprimée")
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-digicampus-text-primary">
        Photos du campus
      </h1>

      {/* Zone d'upload */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-digicampus-text-primary">
          Ajouter une photo
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Preview */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-40 h-28 rounded-lg border-2 border-dashed border-border hover:border-digicampus-primary/50 transition-colors overflow-hidden shrink-0 bg-digicampus-neutral flex items-center justify-center"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="aperçu" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-digicampus-text-secondary">
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">Choisir</span>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Caption + bouton */}
          <div className="flex-1 space-y-3">
            <Input
              placeholder="Légende (ex: Salle Afrique en session)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-digicampus-text-secondary">
              Formats acceptés : JPG, PNG, WebP — max {MAX_SIZE_MB} Mo
            </p>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="bg-digicampus-primary hover:bg-digicampus-primary-dark text-white"
            >
              {uploading
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Upload className="w-4 h-4 mr-2" />}
              Ajouter la photo
            </Button>
          </div>
        </div>
      </div>

      {/* Grille des photos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center space-y-2">
          <ImageIcon className="w-10 h-10 text-digicampus-text-secondary mx-auto" />
          <p className="text-sm font-medium text-digicampus-text-primary">Aucune photo</p>
          <p className="text-xs text-digicampus-text-secondary">
            Ajoutez une première photo pour qu&apos;elle apparaisse sur la page de connexion
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photos.map(photo => (
            <div
              key={photo.id}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                photo.is_active ? "border-border" : "border-border opacity-60"
              }`}
            >
              {/* Image */}
              <div className="relative w-full h-44 bg-digicampus-neutral">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photosApi.url(photo.filename)}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge
                    className={
                      photo.is_active
                        ? "bg-digicampus-success/90 text-white text-xs"
                        : "bg-gray-500/80 text-white text-xs"
                    }
                  >
                    {photo.is_active ? "Visible" : "Masquée"}
                  </Badge>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 space-y-3">
                {/* Caption éditable */}
                <div className="flex gap-2">
                  <Input
                    value={captions[photo.id] ?? photo.caption}
                    onChange={e => setCaptions(c => ({ ...c, [photo.id]: e.target.value }))}
                    placeholder="Légende…"
                    className="h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-9 w-9 p-0"
                    onClick={() => saveCaption(photo)}
                    title="Enregistrer la légende"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => toggleActive(photo)}
                  >
                    {photo.is_active
                      ? <><EyeOff className="w-3.5 h-3.5" /> Masquer</>
                      : <><Eye className="w-3.5 h-3.5" /> Afficher</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs text-digicampus-danger hover:bg-red-50 hover:border-red-200"
                    onClick={() => setDeleteTarget(photo)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la photo ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-digicampus-text-secondary">
            Cette action est irréversible. La photo sera supprimée du serveur.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              className="bg-digicampus-danger hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
