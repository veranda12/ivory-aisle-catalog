import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Pencil, Plus } from 'lucide-react'
import { AdminHeader } from './AdminLayout'
import { useAdminChapters } from '@/lib/queries'
import { api, uploadWithProgress } from '@/lib/api'
import { prepareForUpload } from '@/lib/image'
import { cx } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Empty } from '@/components/ui/Reveal'
import { useToast } from '@/components/ui/Toast'
import { Toggle } from '@/components/admin/ProductFields'
import type { ChapterDTO } from '@shared/types'

const SILK = [0.22, 1, 0.36, 1] as const
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']

export function useInvalidateSite() {
  const qc = useQueryClient()
  return () => {
    for (const k of ['admin', 'catalog', 'filters', 'site', 'photo', 'home', 'chapters']) qc.invalidateQueries({ queryKey: [k] })
  }
}

export default function ChaptersAdminPage() {
  const { data: chapters, isPending, isError, refetch } = useAdminChapters()
  const [editing, setEditing] = useState<ChapterDTO | 'new' | null>(null)

  return (
    <div>
      <AdminHeader
        eyebrow={chapters ? `${chapters.length} chapter` : 'Memuat…'}
        title="Chapter"
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
            <Plus className="size-4" strokeWidth={1.75} /> Chapter
          </button>
        }
      />
      <p className="-mt-2 mb-6 max-w-xl px-4 text-ink-soft sm:px-6 lg:px-10">
        Chapter adalah koleksi bertema. Setiap gaun bisa dimasukkan ke satu chapter. Chapter dengan opsi “tampil di menu” muncul langsung di navigasi situs (mis. Korset).
      </p>
      <div className="px-4 sm:px-6 lg:px-10">
        {isError ? (
          <Empty title="Gagal memuat chapter." body="Coba lagi sebentar." action={<button className="btn-secondary" onClick={() => refetch()}>Coba lagi</button>} />
        ) : isPending ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton aspect-[4/5]" />
            ))}
          </div>
        ) : !chapters?.length ? (
          <Empty
            title="Belum ada chapter."
            body="Kelompokkan koleksimu jadi cerita-cerita bertema."
            action={
              <button className="btn-primary" onClick={() => setEditing('new')}>
                <Plus className="size-4" /> Buat chapter
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {chapters.map((c, i) => (
              <motion.li key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: SILK, delay: i * 0.04 }}>
                <button type="button" onClick={() => setEditing(c)} className="group block w-full rounded-xs text-left">
                  <div className="relative overflow-hidden rounded-xs">
                    {c.coverUrl ? (
                      <Img src={c.coverThumb ?? c.coverUrl} blur={c.coverBlur} alt={c.name} intrinsic={false} className="aspect-[4/5]" imgClassName="group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center bg-linear-to-br from-plum to-berry text-blush/70">
                        <ImagePlus className="size-7" strokeWidth={1.2} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-noir/75 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-[0.65rem] tracking-[0.18em] text-gold-soft uppercase">Chapter {c.numeral}</p>
                      <p className="font-display text-xl leading-tight text-blush italic">{c.name}</p>
                    </div>
                    <span className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-paper/90 text-plum">
                      <Pencil className="size-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted">
                    <span>{c.photoCount} foto</span>
                    {c.showInNav && <span className="text-plum">· di menu</span>}
                    {!c.isActive && <span className="text-danger">· nonaktif</span>}
                    {c.coverIsFallback && <span>· sampul otomatis</span>}
                  </p>
                </button>
                <Link to={`/admin/photos?chapter=${c.id}`} className="text-xs text-plum underline-offset-4 hover:underline">
                  Lihat fotonya
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} eyebrow="Chapter" title={editing === 'new' ? 'Chapter baru' : 'Ubah chapter'}>
        {editing && (
          <ChapterForm
            key={editing === 'new' ? 'new' : editing.id}
            chapter={editing === 'new' ? null : editing}
            nextNumeral={ROMAN[chapters?.length ?? 0] ?? ''}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

function ChapterForm({ chapter, nextNumeral, onDone }: { chapter: ChapterDTO | null; nextNumeral: string; onDone: () => void }) {
  const [name, setName] = useState(chapter?.name ?? '')
  const [numeral, setNumeral] = useState(chapter?.numeral ?? nextNumeral)
  const [description, setDescription] = useState(chapter?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(chapter?.sortOrder ?? ''))
  const [showInNav, setShowInNav] = useState(chapter?.showInNav ?? false)
  const [isActive, setIsActive] = useState(chapter?.isActive ?? true)
  const [cover, setCover] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const invalidate = useInvalidateSite()
  const preview = cover ? URL.createObjectURL(cover) : removeCover ? null : chapter && !chapter.coverIsFallback ? chapter.coverThumb : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setProgress(0.02)
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('numeral', numeral)
      form.append('description', description)
      if (sortOrder) form.append('sortOrder', sortOrder)
      form.append('showInNav', String(showInNav))
      form.append('isActive', String(isActive))
      if (cover) form.append('cover', await prepareForUpload(cover))
      if (removeCover) form.append('removeCover', 'true')
      await uploadWithProgress(chapter ? `/admin/chapters/${chapter.id}` : '/admin/chapters', form, {
        method: chapter ? 'PATCH' : 'POST',
        onProgress: (r) => setProgress(r),
      })
      invalidate()
      toast(chapter ? 'Chapter disimpan' : `Chapter "${name}" dibuat`)
      onDone()
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
    } finally {
      setProgress(null)
    }
  }

  const remove = useMutation({
    mutationFn: () => api(`/admin/chapters/${chapter!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      toast('Chapter dihapus')
      onDone()
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  return (
    <form onSubmit={submit} className="space-y-5 pb-6">
      <div>
        <p className="field-label">Sampul</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            setCover(e.target.files?.[0] ?? null)
            setRemoveCover(false)
            e.target.value = ''
          }}
        />
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cx('relative flex aspect-[4/5] w-32 items-center justify-center overflow-hidden rounded-xs border border-dashed border-line-strong text-muted hover:border-plum', preview && 'border-solid')}
          >
            {preview ? <img src={preview} alt="" className="absolute inset-0 size-full object-cover" /> : <ImagePlus className="size-6" strokeWidth={1.3} />}
          </button>
          <div className="space-y-1 text-sm">
            <button type="button" className="block text-plum underline-offset-4 hover:underline" onClick={() => fileRef.current?.click()}>
              {preview ? 'Ganti sampul' : 'Pilih sampul'}
            </button>
            {preview && (
              <button
                type="button"
                className="block text-danger underline-offset-4 hover:underline"
                onClick={() => {
                  setCover(null)
                  setRemoveCover(true)
                }}
              >
                Hapus sampul
              </button>
            )}
            <p className="text-xs text-muted">Kosong = pakai foto terbaru di chapter ini.</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <div>
          <label htmlFor="ch-num" className="field-label">
            Nomor
          </label>
          <input id="ch-num" className="input" value={numeral} onChange={(e) => setNumeral(e.target.value)} maxLength={12} placeholder="I" />
        </div>
        <div>
          <label htmlFor="ch-name" className="field-label">
            Nama
          </label>
          <input id="ch-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required data-autofocus placeholder="mis. Taman Mawar" />
        </div>
      </div>
      <div>
        <label htmlFor="ch-desc" className="field-label">
          Deskripsi
        </label>
        <textarea id="ch-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} placeholder="Cerita singkat & inspirasi chapter ini" />
      </div>
      <div>
        <label htmlFor="ch-order" className="field-label">
          Urutan <span className="font-normal text-muted">(angka kecil tampil lebih dulu)</span>
        </label>
        <input id="ch-order" className="input w-28" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d]/g, ''))} />
      </div>
      <Toggle checked={showInNav} onChange={setShowInNav} title="Tampil di menu" hint="Muncul langsung di navigasi atas situs" />
      <Toggle checked={isActive} onChange={setIsActive} title="Aktif" hint="Chapter nonaktif disembunyikan dari pengunjung" />

      {progress !== null && (
        <div className="h-1 overflow-hidden rounded-full bg-mist">
          <div className="h-full bg-plum transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex gap-3 pt-2">
        {chapter && (
          <button type="button" className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
            Hapus
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={!name.trim() || progress !== null}>
          {progress !== null ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Hapus chapter ${chapter?.name ?? ''}?`}
        description={`${chapter?.photoCount ?? 0} foto di dalamnya tidak ikut terhapus — hanya dilepas dari chapter ini.`}
        confirmLabel="Hapus chapter"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </form>
  )
}
