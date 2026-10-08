import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Check, ImagePlus, Pencil, Plus, RotateCw, UploadCloud, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminHeader } from './AdminLayout'
import { TagField } from '@/components/admin/TagPicker'
import { EMPTY_PRODUCT, ProductFields, productPayload, type ProductFieldsValue } from '@/components/admin/ProductFields'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { uploadWithProgress } from '@/lib/api'
import { prepareForUpload } from '@/lib/image'
import { cx, formatBytes } from '@/lib/format'
import type { AdminPhotoDTO } from '@shared/types'

type Status = 'ready' | 'uploading' | 'done' | 'error'
type Item = {
  key: string
  file: File
  preview: string
  status: Status
  progress: number
  error?: string
  title: string
  price: string
  result?: AdminPhotoDTO
}

const SILK = [0.22, 1, 0.36, 1] as const
const MAX_FILES = 40
const CONCURRENCY = 2

let seq = 0

export default function UploadPage() {
  const [items, setItems] = useState<Item[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [product, setProduct] = useState<ProductFieldsValue>(EMPTY_PRODUCT)
  const { price, isActive } = product
  const [editing, setEditing] = useState<string | null>(null)
  const [phase, setPhase] = useState<'edit' | 'uploading' | 'done'>('edit')
  const [dragOver, setDragOver] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  // Bersihkan object URL saat keluar halaman.
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), [])

  // Peringatkan bila menutup tab saat upload berjalan.
  useEffect(() => {
    if (phase !== 'uploading') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [phase])

  const addFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return
      const files = [...list].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
      const skipped = list.length - files.length
      setItems((prev) => {
        const room = MAX_FILES - prev.length
        if (files.length > room) toast(`Maksimal ${MAX_FILES} foto sekali upload.`, { tone: 'error' })
        return [
          ...prev,
          ...files.slice(0, Math.max(0, room)).map((file) => ({
            key: `f${++seq}`,
            file,
            preview: URL.createObjectURL(file),
            status: 'ready' as const,
            progress: 0,
            title: '',
            price: '',
          })),
        ]
      })
      if (skipped > 0) toast(`${skipped} file dilewati karena bukan foto.`, { tone: 'error' })
      setPhase('edit')
    },
    [toast],
  )

  const patch = (key: string, data: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...data } : i)))

  const remove = (key: string) =>
    setItems((prev) => {
      const item = prev.find((i) => i.key === key)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.key !== key)
    })

  const uploadOne = async (item: Item) => {
    patch(item.key, { status: 'uploading', progress: 0.02, error: undefined })
    try {
      const file = await prepareForUpload(item.file)
      const form = new FormData()
      form.append('file', file)
      if (item.title.trim()) form.append('title', item.title.trim())
      const payload = productPayload(product)
      const p = item.price || price
      if (p) form.append('price', p)
      form.append('kind', payload.kind)
      if (payload.chapterId) form.append('chapterId', payload.chapterId)
      if (payload.deposit) form.append('deposit', payload.deposit)
      for (const k of ['bust', 'waist', 'length', 'description'] as const) {
        const v = payload[k]?.trim()
        if (v) form.append(k, v)
      }
      form.append('isFeatured', String(payload.isFeatured))
      form.append('tagIds', JSON.stringify(tagIds))
      form.append('isActive', String(isActive))
      const result = await uploadWithProgress<AdminPhotoDTO>('/admin/photos', form, {
        onProgress: (r) => patch(item.key, { progress: Math.max(0.05, r * 0.9) }),
      })
      patch(item.key, { status: 'done', progress: 1, result })
      return true
    } catch (err) {
      patch(item.key, { status: 'error', error: (err as Error).message, progress: 0 })
      return false
    }
  }

  const publish = async (only?: Item[]) => {
    const queue = [...(only ?? itemsRef.current.filter((i) => i.status !== 'done'))]
    if (!queue.length) return
    setPhase('uploading')
    let failed = 0
    const worker = async () => {
      while (queue.length) {
        const next = queue.shift()!
        if (!(await uploadOne(next))) failed++
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
    qc.invalidateQueries({ queryKey: ['filters'] })
    qc.invalidateQueries({ queryKey: ['site'] })

    if (failed) {
      setPhase('edit')
      toast(`${failed} foto gagal diunggah. Coba lagi.`, { tone: 'error' })
    } else {
      setPhase('done')
    }
  }

  const reset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.preview))
    setItems([])
    setPhase('edit')
  }

  const pending = items.filter((i) => i.status !== 'done')
  const done = items.filter((i) => i.status === 'done')
  const failed = items.filter((i) => i.status === 'error')
  const overall = items.length ? items.reduce((s, i) => s + (i.status === 'done' ? 1 : i.progress), 0) / items.length : 0
  const editingItem = items.find((i) => i.key === editing)

  const hiddenInputs = (
    <>
      <input
        ref={galleryInput}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )

  // ───────── Selesai ─────────
  if (phase === 'done') {
    return (
      <div className="px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: SILK }}
          className="mx-auto flex max-w-lg flex-col items-center py-16 text-center lg:py-24"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
            className="mb-8 flex size-16 items-center justify-center rounded-full bg-plum text-paper"
          >
            <Check className="size-8" strokeWidth={1.5} />
          </motion.span>
          <h1 className="display text-[2.75rem] leading-none">
            {done.length} look <em className="text-plum">{isActive ? 'sudah tayang.' : 'tersimpan.'}</em>
          </h1>
          <p className="mt-3 text-ink-soft">
            {isActive ? 'Pengunjung sudah bisa melihatnya di katalog.' : 'Foto disimpan sebagai tersembunyi. Tampilkan kapan saja dari daftar foto.'}
          </p>
          <div className="mt-8 flex gap-1.5">
            {done.slice(0, 6).map((i, n) => (
              <motion.img
                key={i.key}
                src={i.preview}
                alt=""
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + n * 0.06, duration: 0.6, ease: SILK }}
                className="h-20 w-14 rounded-xs object-cover"
              />
            ))}
          </div>
          <div className="mt-10 grid w-full grid-cols-2 gap-3">
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/photos')}>
              Lihat daftar
            </button>
            <button type="button" className="btn-primary" onClick={reset}>
              <Plus className="size-5" strokeWidth={1.5} /> Tambah lagi
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ───────── Pilih foto ─────────
  if (!items.length) {
    return (
      <div>
        <AdminHeader eyebrow="Upload" title="Tambah look" back={<BackLink />} />
        <div className="px-4 sm:px-6 lg:px-10">
          {hiddenInputs}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: SILK }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
            className={cx(
              'flex flex-col items-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors duration-300 lg:py-24',
              dragOver ? 'border-plum bg-blush/40' : 'border-line-strong bg-paper/50',
            )}
          >
            <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-blush/70 text-plum">
              <ImagePlus className="size-7" strokeWidth={1.25} />
            </span>
            <h2 className="display text-[2.25rem] leading-none">Tambah foto</h2>
            <p className="mt-3 max-w-xs text-ink-soft">
              Ambil foto langsung atau pilih dari galeri. Bisa banyak sekaligus.
            </p>
            <div className="mt-8 grid w-full max-w-sm gap-3">
              <button type="button" className="btn-primary min-h-14 text-base" onClick={() => galleryInput.current?.click()}>
                <ImagePlus className="size-5" strokeWidth={1.5} /> Pilih dari galeri
              </button>
              <button type="button" className="btn-secondary min-h-14 text-base lg:hidden" onClick={() => cameraInput.current?.click()}>
                <Camera className="size-5" strokeWidth={1.5} /> Ambil foto
              </button>
            </div>
            <p className="mt-6 hidden text-sm text-muted lg:block">atau seret foto ke sini</p>
            <p className="mt-4 text-xs text-muted">JPG, PNG, WebP · foto besar otomatis dikecilkan</p>
          </motion.div>
        </div>
      </div>
    )
  }

  // ───────── Review & upload ─────────
  const uploading = phase === 'uploading'
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (!uploading) addFiles(e.dataTransfer.files)
      }}
    >
      {hiddenInputs}
      <AdminHeader
        eyebrow={uploading ? 'Mengunggah…' : `${items.length} foto dipilih`}
        title={uploading ? 'Sedang diunggah' : 'Siap diterbitkan'}
        back={<BackLink onClick={items.length && !uploading ? () => setLeaveConfirm(true) : undefined} />}
      />

      <div className="grid gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:gap-12 lg:px-10">
        {/* Preview */}
        <section aria-label="Foto terpilih">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.key}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.5, ease: SILK }}
                  className="relative"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xs bg-mist">
                    <img src={item.preview} alt={item.title || item.file.name} className="size-full object-cover" />
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 flex flex-col justify-end bg-ink/35 p-3">
                        <span className="mb-1.5 text-xs font-semibold text-paper">{Math.round(item.progress * 100)}%</span>
                        <div className="h-1 overflow-hidden rounded-full bg-paper/30">
                          <motion.div className="h-full bg-paper" animate={{ width: `${item.progress * 100}%` }} transition={{ ease: 'easeOut' }} />
                        </div>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-plum/45">
                        <Check className="size-9 text-paper" strokeWidth={1.5} />
                      </motion.div>
                    )}
                    {item.status === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/85 p-3 text-center">
                        <p className="text-sm text-danger">{item.error}</p>
                        <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => publish([item])} disabled={uploading}>
                          <RotateCw className="size-4" /> Coba lagi
                        </button>
                      </div>
                    )}
                    {!uploading && item.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
                        className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft"
                        aria-label={`Hapus ${item.file.name} dari daftar`}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(item.key)}
                    disabled={uploading || item.status === 'done'}
                    className="mt-1.5 flex w-full items-center gap-1.5 rounded-xs py-1 text-left text-sm disabled:opacity-60"
                  >
                    <span className={cx('min-w-0 flex-1 truncate', item.title ? 'text-ink' : 'text-muted')}>
                      {item.title || 'Tanpa judul'}
                    </span>
                    {item.price && <span className="text-xs text-ink-soft">Rp{Number(item.price).toLocaleString('id-ID')}</span>}
                    <Pencil className="size-3.5 shrink-0 text-muted" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            {!uploading && items.length < MAX_FILES && (
              <li>
                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-line-strong text-ink-soft transition-colors hover:border-plum hover:text-plum"
                >
                  <Plus className="size-6" strokeWidth={1.25} />
                  <span className="text-sm">Tambah</span>
                </button>
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Total {formatBytes(items.reduce((s, i) => s + i.file.size, 0))} · Ketuk judul untuk mengubah nama & harga per foto.
          </p>
        </section>

        {/* Metadata bersama */}
        <section aria-label="Detail untuk semua foto" className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow">Berlaku untuk semua foto</p>
          <TagField value={tagIds} onChange={setTagIds} />
          <ProductFields value={product} onChange={setProduct} idPrefix="up" />

          {/* Tombol terbit — menempel di bawah pada HP */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            {uploading && (
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={Math.round(overall * 100)} aria-valuemin={0} aria-valuemax={100}>
                <motion.div className="h-full bg-plum" animate={{ width: `${overall * 100}%` }} transition={{ ease: 'easeOut' }} />
              </div>
            )}
            <button type="button" className="btn-primary min-h-14 w-full text-base" disabled={uploading || !pending.length} onClick={() => publish()}>
              <UploadCloud className="size-5" strokeWidth={1.5} />
              {uploading
                ? `Mengunggah ${done.length + 1} dari ${items.length}…`
                : failed.length
                  ? `Ulangi ${failed.length} foto gagal`
                  : `Terbitkan ${pending.length} foto`}
            </button>
          </div>
        </section>
      </div>

      <Sheet open={!!editingItem} onClose={() => setEditing(null)} title="Detail foto" variant="bottom">
        {editingItem && (
          <div className="space-y-4 pb-4">
            <img src={editingItem.preview} alt="" className="h-40 w-auto rounded-xs object-cover" />
            <div>
              <label htmlFor="item-title" className="field-label">
                Judul
              </label>
              <input
                id="item-title"
                className="input"
                value={editingItem.title}
                onChange={(e) => patch(editingItem.key, { title: e.target.value })}
                placeholder="mis. Aruna Satin Gown"
                maxLength={120}
                data-autofocus
              />
              <p className="mt-1 text-xs text-muted">Kosongkan untuk penomoran otomatis.</p>
            </div>
            <div>
              <label htmlFor="item-price" className="field-label">
                Harga khusus (Rp)
              </label>
              <input
                id="item-price"
                className="input"
                inputMode="numeric"
                value={editingItem.price ? Number(editingItem.price).toLocaleString('id-ID') : ''}
                onChange={(e) => patch(editingItem.key, { price: e.target.value.replace(/[^\d]/g, '') })}
                placeholder={price ? `Ikut harga umum (${Number(price).toLocaleString('id-ID')})` : 'opsional'}
              />
            </div>
            <button type="button" className="btn-primary w-full" onClick={() => setEditing(null)}>
              Simpan
            </button>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={leaveConfirm}
        title="Batalkan upload?"
        description={`${pending.length} foto yang belum diterbitkan akan dibuang.`}
        confirmLabel="Ya, batalkan"
        cancelLabel="Lanjutkan"
        onCancel={() => setLeaveConfirm(false)}
        onConfirm={() => {
          setLeaveConfirm(false)
          navigate('/admin/photos')
        }}
      />
    </div>
  )
}

function BackLink({ onClick }: { onClick?: () => void }) {
  const cls = 'mb-4 inline-flex items-center gap-1 rounded-sm text-sm text-ink-soft hover:text-plum'
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        ← Daftar foto
      </button>
    )
  return (
    <Link to="/admin/photos" className={cls}>
      ← Daftar foto
    </Link>
  )
}
