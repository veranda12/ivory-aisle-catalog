import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, ImagePlus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { AdminHeader } from './AdminLayout'
import { keys, useAdminPhoto } from '@/lib/queries'
import { api, uploadWithProgress } from '@/lib/api'
import { prepareForUpload } from '@/lib/image'
import { formatBytes, formatDate } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Empty } from '@/components/ui/Reveal'
import { useToast } from '@/components/ui/Toast'
import { TagField } from '@/components/admin/TagPicker'
import { EMPTY_PRODUCT, ProductFields, productPayload, type ProductFieldsValue } from '@/components/admin/ProductFields'
import type { AdminPhotoDTO } from '@shared/types'

const toForm = (p: AdminPhotoDTO): ProductFieldsValue => ({
  kind: p.kind,
  chapterId: p.chapter?.id ?? '',
  price: p.price != null ? String(p.price) : '',
  deposit: p.deposit != null ? String(p.deposit) : '',
  bust: p.bust ?? '',
  waist: p.waist ?? '',
  length: p.length ?? '',
  description: p.description ?? '',
  isActive: p.isActive,
  isFeatured: p.isFeatured,
})

export default function EditPhotoPage() {
  const { id = '' } = useParams()
  const { data: photo, isPending, isError } = useAdminPhoto(id)
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const replaceInput = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [product, setProduct] = useState<ProductFieldsValue>(EMPTY_PRODUCT)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null)

  useEffect(() => {
    if (!photo) return
    setTitle(photo.title)
    setTagIds(photo.tags.map((t) => t.id))
    setProduct(toForm(photo))
  }, [photo])

  const invalidate = () => {
    for (const k of ['admin', 'catalog', 'filters', 'site', 'photo', 'home', 'chapters']) qc.invalidateQueries({ queryKey: [k] })
  }

  const save = useMutation({
    mutationFn: () => api<AdminPhotoDTO>(`/admin/photos/${id}`, { method: 'PATCH', body: { title, tagIds, ...productPayload(product) } }),
    onSuccess: (updated) => {
      qc.setQueryData(keys.adminPhoto(id), updated)
      invalidate()
      toast('Perubahan disimpan')
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  const remove = useMutation({
    mutationFn: () => api(`/admin/photos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      toast('Look dihapus')
      navigate('/admin/photos', { replace: true })
    },
    onError: (err) => {
      setConfirmDelete(false)
      toast((err as Error).message, { tone: 'error' })
    },
  })

  const replace = async (file: File | undefined) => {
    if (!file) return
    setReplaceProgress(0.02)
    try {
      const prepared = await prepareForUpload(file)
      const form = new FormData()
      form.append('file', prepared)
      const updated = await uploadWithProgress<AdminPhotoDTO>(`/admin/photos/${id}/image`, form, {
        method: 'PUT',
        onProgress: (r) => setReplaceProgress(Math.max(0.05, r * 0.9)),
      })
      qc.setQueryData(keys.adminPhoto(id), updated)
      invalidate()
      toast('Foto utama diganti')
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
    } finally {
      setReplaceProgress(null)
    }
  }

  if (isError) {
    return (
      <Empty
        title="Foto tidak ditemukan."
        body="Mungkin sudah dihapus."
        action={
          <Link to="/admin/photos" className="btn-primary">
            Kembali ke daftar
          </Link>
        }
      />
    )
  }

  const original = photo ? toForm(photo) : null
  const dirty =
    !!photo &&
    !!original &&
    (title !== photo.title ||
      JSON.stringify(product) !== JSON.stringify(original) ||
      tagIds.slice().sort().join() !== photo.tags.map((t) => t.id).sort().join())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast('Judul tidak boleh kosong', { tone: 'error' })
    save.mutate()
  }

  return (
    <div>
      <AdminHeader
        eyebrow={photo?.kind === 'ADDON' ? 'Ubah add-on' : 'Ubah look'}
        title={photo?.title ?? '…'}
        back={
          <Link to="/admin/photos" className="mb-4 inline-flex rounded-sm text-sm text-ink-soft hover:text-plum">
            ← Daftar foto
          </Link>
        }
      />
      {isPending || !photo ? (
        <div className="grid gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-10">
          <div className="skeleton aspect-[3/4]" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12 lg:px-10">
          {/* Foto */}
          <div>
            <div className="relative">
              <Img src={photo.imageUrl} blur={photo.blurDataUrl} alt={photo.title} width={photo.width} height={photo.height} className="max-h-[60dvh] lg:max-h-none" intrinsic={!!photo.width} />
              <span className="absolute top-2 left-2 rounded-xs bg-noir/70 px-2 py-0.5 text-xs text-blush">Foto utama</span>
              {replaceProgress !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/80">
                  <p className="display text-xl italic">Mengganti foto…</p>
                  <div className="h-1 w-40 overflow-hidden rounded-full bg-mist">
                    <div className="h-full bg-plum transition-[width]" style={{ width: `${replaceProgress * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
            <input
              ref={replaceInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                replace(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => replaceInput.current?.click()} disabled={replaceProgress !== null}>
                <RefreshCw className="size-4" strokeWidth={1.5} /> Ganti foto
              </button>
              <a
                href={`/catalog/${photo.slug}`}
                target="_blank"
                rel="noreferrer"
                className={`btn-secondary ${!photo.isActive ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={!photo.isActive}
              >
                <ExternalLink className="size-4" strokeWidth={1.5} /> Lihat
              </a>
            </div>
            <p className="mt-3 text-xs text-muted">
              {photo.width}×{photo.height}px · {formatBytes(photo.sizeBytes)} · diunggah {formatDate(photo.createdAt)}
            </p>

            <GalleryManager photo={photo} onUpdated={(p) => {
              qc.setQueryData(keys.adminPhoto(id), p)
              invalidate()
            }} />
          </div>

          {/* Detail */}
          <div className="space-y-5 lg:max-w-xl">
            <div>
              <label htmlFor="title" className="field-label">
                Judul
              </label>
              <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>
            <TagField value={tagIds} onChange={setTagIds} />
            <ProductFields value={product} onChange={setProduct} idPrefix="ed" />

            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:pt-4">
              <button type="button" className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" strokeWidth={1.5} /> Hapus
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={!dirty || save.isPending}>
                {save.isPending ? 'Menyimpan…' : dirty ? 'Simpan perubahan' : 'Tersimpan'}
              </button>
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus look ini?"
        description={`Foto ini${photo?.images.length ? ` beserta ${photo.images.length} foto galerinya` : ''} akan dihapus dari katalog secara permanen.`}
        confirmLabel="Hapus foto"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}

/** Foto tambahan (galeri) — tambah, hapus, jadikan utama. */
function GalleryManager({ photo, onUpdated }: { photo: AdminPhotoDTO; onUpdated: (p: AdminPhotoDTO) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [uploading, setUploading] = useState<{ done: number; total: number; progress: number } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files].slice(0, 12 - photo.images.length)
    let last: AdminPhotoDTO | null = null
    for (const [i, file] of list.entries()) {
      setUploading({ done: i, total: list.length, progress: 0 })
      try {
        const form = new FormData()
        form.append('file', await prepareForUpload(file))
        last = await uploadWithProgress<AdminPhotoDTO>(`/admin/photos/${photo.id}/images`, form, {
          onProgress: (r) => setUploading({ done: i, total: list.length, progress: r }),
        })
      } catch (err) {
        toast(`${file.name}: ${(err as Error).message}`, { tone: 'error' })
      }
    }
    setUploading(null)
    if (last) {
      onUpdated(last)
      toast('Foto galeri ditambahkan')
    }
  }

  const act = async (path: string, method: 'DELETE' | 'POST', message: string) => {
    setBusy(true)
    try {
      onUpdated(await api<AdminPhotoDTO>(path, { method }))
      toast(message)
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <section className="mt-8" aria-label="Galeri foto">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-[1.5rem] italic">Galeri</h2>
        <span className="text-xs text-muted">{photo.images.length}/12 foto tambahan</span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ''
        }}
      />
      <ul className="grid grid-cols-3 gap-2">
        <AnimatePresence initial={false}>
          {photo.images.map((img) => (
            <motion.li key={img.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} className="group relative">
              <Img src={img.thumbnailUrl} blur={img.blurDataUrl} alt="" intrinsic={false} className="aspect-[3/4] rounded-xs" />
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(`/admin/photos/${photo.id}/images/${img.id}/primary`, 'POST', 'Foto utama diganti')}
                  className="flex size-9 items-center justify-center rounded-full bg-paper/90 text-plum shadow-soft"
                  aria-label="Jadikan foto utama"
                  title="Jadikan foto utama"
                >
                  <Star className="size-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm(img.id)}
                  className="flex size-9 items-center justify-center rounded-full bg-paper/90 text-danger shadow-soft"
                  aria-label="Hapus foto galeri"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {photo.images.length < 12 && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={!!uploading}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-xs border border-dashed border-line-strong px-2 text-center text-ink-soft transition-colors hover:border-plum hover:text-plum"
            >
              {uploading ? (
                <>
                  <span className="text-xs">
                    {uploading.done + 1}/{uploading.total}
                  </span>
                  <span className="h-1 w-3/4 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full bg-plum transition-[width]" style={{ width: `${uploading.progress * 100}%` }} />
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-5" strokeWidth={1.4} />
                  <span className="text-xs">Tambah foto</span>
                </>
              )}
            </button>
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-muted">Pengunjung bisa menggeser semua foto ini di halaman produk. Ketuk ★ untuk menjadikan foto utama.</p>

      <ConfirmDialog
        open={!!confirm}
        title="Hapus foto ini?"
        description="Foto akan dihapus dari galeri produk."
        confirmLabel="Hapus foto"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && act(`/admin/photos/${photo.id}/images/${confirm}`, 'DELETE', 'Foto galeri dihapus')}
      />
    </section>
  )
}
