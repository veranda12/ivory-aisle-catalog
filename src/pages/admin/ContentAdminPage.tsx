import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { AdminHeader } from './AdminLayout'
import { useInvalidateSite } from './ChaptersAdminPage'
import { keys, useAdminPhotos, useContent, useMe, useShowcases, useTestimonials } from '@/lib/queries'
import { api, uploadWithProgress } from '@/lib/api'
import { prepareForUpload } from '@/lib/image'
import { useDebounced } from '@/lib/hooks'
import { cx } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Empty } from '@/components/ui/Reveal'
import { useToast } from '@/components/ui/Toast'
import { Toggle } from '@/components/admin/ProductFields'
import type { ShowcaseDTO, TestimonialDTO } from '@shared/types'
import type { ContentItem, Lang, LocalizedContent, SiteContent } from '@shared/content'

const TABS = [
  { id: 'pages', label: 'Halaman' },
  { id: 'testimonials', label: 'Testimoni' },
  { id: 'wornby', label: 'Worn By' },
] as const

export default function ContentAdminPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as (typeof TABS)[number]['id']) ?? 'pages'

  return (
    <div>
      <AdminHeader eyebrow="Situs" title="Konten" />
      <div className="sticky top-0 z-20 border-b border-line/70 bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="flex gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={cx(
                'relative min-h-12 px-3 text-[0.95rem] transition-colors',
                tab === t.id ? 'font-semibold text-plum' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.label}
              {tab === t.id && <motion.span layoutId="content-tab" className="absolute inset-x-2 bottom-0 h-0.5 bg-plum" />}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-6 sm:px-6 lg:px-10">
        {tab === 'pages' && <PagesEditor />}
        {tab === 'testimonials' && <TestimonialsManager />}
        {tab === 'wornby' && <ShowcaseManager />}
      </div>
    </div>
  )
}

// ───────────────────────── Editor halaman ─────────────────────────

type TextKey = 'announcement' | 'heroKicker' | 'wornByTitle' | 'wornByIntro' | 'fittingIntro' | 'aboutTitle' | 'aboutIntro' | 'aboutBody'
type ListKey = 'journey' | 'periodGuide' | 'terms' | 'fittingSchedule' | 'fittingPolicy' | 'why'

const SECTIONS: { title: string; hint?: string; fields: ({ kind: 'text'; key: TextKey; label: string; long?: boolean } | { kind: 'list'; key: ListKey; label: string; fixed?: number })[] }[] = [
  {
    title: 'Beranda',
    fields: [
      { kind: 'text', key: 'announcement', label: 'Teks pengumuman (bar paling atas)' },
      { kind: 'text', key: 'heroKicker', label: 'Kalimat di hero', long: true },
      { kind: 'text', key: 'wornByTitle', label: 'Judul “Worn By”' },
      { kind: 'text', key: 'wornByIntro', label: 'Pengantar “Worn By”', long: true },
    ],
  },
  {
    title: 'Cara Sewa',
    hint: 'Alur pemesanan juga tampil di beranda.',
    fields: [
      { kind: 'list', key: 'journey', label: 'Alur pemesanan' },
      { kind: 'list', key: 'periodGuide', label: 'Panduan periode (hari terima · hari acara · hari kembali)', fixed: 3 },
      { kind: 'list', key: 'terms', label: 'Syarat & ketentuan' },
    ],
  },
  {
    title: 'Fitting Online',
    fields: [
      { kind: 'text', key: 'fittingIntro', label: 'Pengantar', long: true },
      { kind: 'list', key: 'fittingSchedule', label: 'Jadwal satu hari fitting' },
      { kind: 'list', key: 'fittingPolicy', label: 'Ketentuan fitting' },
    ],
  },
  {
    title: 'Tentang Kami',
    fields: [
      { kind: 'text', key: 'aboutTitle', label: 'Judul' },
      { kind: 'text', key: 'aboutIntro', label: 'Pengantar', long: true },
      { kind: 'text', key: 'aboutBody', label: 'Cerita', long: true },
      { kind: 'list', key: 'why', label: 'Kenapa kami' },
    ],
  },
]

function PagesEditor() {
  const { data, isPending } = useContent()
  const { data: me } = useMe()
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [lang, setLang] = useState<Lang>('id')
  const qc = useQueryClient()
  const toast = useToast()
  const invalidate = useInvalidateSite()

  useEffect(() => {
    if (data) setDraft(structuredClone(data))
  }, [data])

  const save = useMutation({
    mutationFn: (body: SiteContent) => api<SiteContent>('/admin/content', { method: 'PUT', body }),
    onSuccess: (saved) => {
      qc.setQueryData(keys.content, saved)
      setDraft(structuredClone(saved))
      invalidate()
      toast('Konten disimpan')
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  if (isPending || !draft) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>

  const current = lang === 'id' ? draft.id : draft.en
  const setField = (key: keyof LocalizedContent, value: unknown) =>
    setDraft((d) => (d ? { ...d, [lang]: { ...d[lang], [key]: value } } : d))
  const dirty = JSON.stringify(draft) !== JSON.stringify(data)
  const canEdit = me?.role === 'ADMIN'

  return (
    <div className="max-w-3xl pb-28">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-paper/70 p-3">
        <p className="text-sm text-ink-soft">
          {lang === 'id' ? 'Mengedit versi Indonesia (utama).' : 'Versi Inggris — kosongkan field untuk memakai teks Indonesia.'}
        </p>
        <div className="flex rounded-full border border-line-strong p-0.5 text-xs font-semibold" role="group" aria-label="Bahasa">
          {(['id', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cx('min-h-8 rounded-full px-3 uppercase', lang === l ? 'bg-plum text-paper' : 'text-ink-soft')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="display border-b border-gold/40 pb-2 text-[1.9rem] italic">{section.title}</h2>
            {section.hint && <p className="mt-2 text-sm text-muted">{section.hint}</p>}
            <div className="mt-5 space-y-6">
              {section.fields.map((f) =>
                f.kind === 'text' ? (
                  <div key={f.key}>
                    <label htmlFor={`c-${f.key}`} className="field-label">
                      {f.label}
                    </label>
                    {f.long ? (
                      <textarea
                        id={`c-${f.key}`}
                        className="input"
                        value={(current[f.key] as string | undefined) ?? ''}
                        placeholder={lang === 'en' ? draft.id[f.key] : undefined}
                        onChange={(e) => setField(f.key, e.target.value)}
                        maxLength={1200}
                      />
                    ) : (
                      <input
                        id={`c-${f.key}`}
                        className="input"
                        value={(current[f.key] as string | undefined) ?? ''}
                        placeholder={lang === 'en' ? draft.id[f.key] : undefined}
                        onChange={(e) => setField(f.key, e.target.value)}
                        maxLength={300}
                      />
                    )}
                  </div>
                ) : (
                  <ListEditor
                    key={f.key}
                    label={f.label}
                    fixed={f.fixed}
                    items={(current[f.key] as ContentItem[] | undefined) ?? []}
                    fallback={lang === 'en' ? draft.id[f.key] : undefined}
                    onChange={(items) => setField(f.key, items)}
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md lg:bottom-0 lg:left-[248px]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 lg:mx-0 lg:ml-10">
          {dirty && (
            <button type="button" className="btn-ghost" onClick={() => data && setDraft(structuredClone(data))}>
              Batalkan
            </button>
          )}
          <button type="button" className="btn-primary flex-1" disabled={!dirty || save.isPending || !canEdit} onClick={() => save.mutate(draft)}>
            {!canEdit ? 'Hanya admin yang bisa menyimpan' : save.isPending ? 'Menyimpan…' : dirty ? 'Simpan konten' : 'Tersimpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  fixed,
  fallback,
}: {
  label: string
  items: ContentItem[]
  onChange: (items: ContentItem[]) => void
  fixed?: number
  fallback?: ContentItem[]
}) {
  const update = (i: number, patch: Partial<ContentItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i: number, d: number) => {
    const next = [...items]
    const [it] = next.splice(i, 1)
    next.splice(i + d, 0, it!)
    onChange(next)
  }

  return (
    <div>
      <p className="field-label">{label}</p>
      {fallback && !items.length ? (
        <div className="rounded-sm border border-dashed border-line-strong p-4 text-sm text-ink-soft">
          Memakai versi Indonesia ({fallback.length} item).{' '}
          <button type="button" className="text-plum underline" onClick={() => onChange(structuredClone(fallback))}>
            Salin untuk diterjemahkan
          </button>
        </div>
      ) : (
        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((it, i) => (
              <motion.li key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-sm border border-line bg-paper/70 p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 font-display text-lg text-gold italic">{i + 1}.</span>
                    <input className="input min-h-10 flex-1 font-semibold" value={it.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Judul" maxLength={120} aria-label={`Judul ${i + 1}`} />
                    {!fixed && (
                      <div className="flex shrink-0">
                        <button type="button" className="icon-btn size-9" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Naikkan">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" className="icon-btn size-9" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Turunkan">
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" className="icon-btn size-9 text-danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Hapus">
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea className="input mt-2 min-h-20" value={it.body} onChange={(e) => update(i, { body: e.target.value })} placeholder="Keterangan" maxLength={1200} aria-label={`Keterangan ${i + 1}`} />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {!fixed && !(fallback && !items.length) && (
        <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-semibold text-plum hover:bg-blush/40" onClick={() => onChange([...items, { title: '', body: '' }])}>
          <Plus className="size-4" /> Tambah item
        </button>
      )}
      {fallback && items.length > 0 && (
        <button type="button" className="mt-2 block text-xs text-muted underline" onClick={() => onChange([])}>
          Kosongkan (pakai versi Indonesia)
        </button>
      )}
    </div>
  )
}

// ───────────────────────── Testimoni ─────────────────────────

function TestimonialsManager() {
  const { data, isPending } = useTestimonials()
  const [editing, setEditing] = useState<TestimonialDTO | 'new' | null>(null)
  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-ink-soft">Ulasan pelanggan yang tampil di beranda.</p>
        <button type="button" className="btn-primary shrink-0" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Testimoni
        </button>
      </div>
      {isPending ? (
        <div className="skeleton h-40" />
      ) : !data?.length ? (
        <Empty title="Belum ada testimoni." body="Tambahkan ulasan asli dari pelangganmu." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setEditing(t)} className={cx('flex w-full gap-3 rounded-md border border-line bg-paper/70 p-4 text-left transition-colors hover:border-plum', !t.isActive && 'opacity-60')}>
                {t.photoThumb && <Img src={t.photoThumb} blur={t.photoBlur} alt="" intrinsic={false} className="size-16 shrink-0 rounded-xs" />}
                <div className="min-w-0 flex-1">
                  <p className="script text-[1.6rem] leading-none text-plum">{t.name}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{t.body}</p>
                  {!t.isActive && <p className="mt-1 text-xs text-danger">Disembunyikan</p>}
                </div>
                <Pencil className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} eyebrow="Testimoni" title={editing === 'new' ? 'Testimoni baru' : 'Ubah testimoni'}>
        {editing && <TestimonialForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  )
}

function ImagePickField({ label, current, file, onFile, onRemove, required }: { label: string; current: string | null; file: File | null; onFile: (f: File | null) => void; onRemove?: () => void; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const preview = file ? URL.createObjectURL(file) : current
  return (
    <div>
      <p className="field-label">
        {label} {!required && <span className="font-normal text-muted">(opsional)</span>}
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      <div className="flex items-end gap-3">
        <button type="button" onClick={() => ref.current?.click()} className="relative flex aspect-[4/5] w-28 items-center justify-center overflow-hidden rounded-xs border border-dashed border-line-strong text-muted hover:border-plum">
          {preview ? <img src={preview} alt="" className="absolute inset-0 size-full object-cover" /> : <ImagePlus className="size-6" strokeWidth={1.3} />}
        </button>
        <div className="space-y-1 text-sm">
          <button type="button" className="block text-plum underline-offset-4 hover:underline" onClick={() => ref.current?.click()}>
            {preview ? 'Ganti foto' : 'Pilih foto'}
          </button>
          {preview && onRemove && (
            <button type="button" className="block text-danger underline-offset-4 hover:underline" onClick={onRemove}>
              Hapus foto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TestimonialForm({ item, onDone }: { item: TestimonialDTO | null; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [body, setBody] = useState(item?.body ?? '')
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const toast = useToast()
  const invalidate = useInvalidateSite()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('body', body)
      form.append('sortOrder', sortOrder || '0')
      form.append('isActive', String(isActive))
      if (file) form.append('photo', await prepareForUpload(file))
      if (removePhoto) form.append('removePhoto', 'true')
      await uploadWithProgress(item ? `/admin/testimonials/${item.id}` : '/admin/testimonials', form, { method: item ? 'PATCH' : 'POST' })
      invalidate()
      toast('Testimoni disimpan')
      onDone()
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/admin/testimonials/${item!.id}`, { method: 'DELETE' })
      invalidate()
      toast('Testimoni dihapus')
      onDone()
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-6">
      <ImagePickField
        label="Foto"
        current={removePhoto ? null : (item?.photoThumb ?? null)}
        file={file}
        onFile={(f) => {
          setFile(f)
          setRemovePhoto(false)
        }}
        onRemove={() => {
          setFile(null)
          setRemovePhoto(true)
        }}
      />
      <div>
        <label htmlFor="t-name" className="field-label">
          Nama
        </label>
        <input id="t-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required data-autofocus />
      </div>
      <div>
        <label htmlFor="t-body" className="field-label">
          Isi testimoni
        </label>
        <textarea id="t-body" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} maxLength={800} required />
      </div>
      <div>
        <label htmlFor="t-order" className="field-label">
          Urutan
        </label>
        <input id="t-order" className="input w-28" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d]/g, ''))} />
      </div>
      <Toggle checked={isActive} onChange={setIsActive} title="Tampilkan" hint="Muncul di beranda" />
      <div className="flex gap-3 pt-2">
        {item && (
          <button type="button" className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Hapus
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={busy || !name.trim() || !body.trim()}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
      <ConfirmDialog open={confirm} title="Hapus testimoni ini?" description="Testimoni akan dihapus dari beranda." confirmLabel="Hapus" busy={busy} onCancel={() => setConfirm(false)} onConfirm={remove} />
    </form>
  )
}

// ───────────────────────── Worn by ─────────────────────────

function ShowcaseManager() {
  const { data, isPending } = useShowcases()
  const [editing, setEditing] = useState<ShowcaseDTO | 'new' | null>(null)
  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-ink-soft">Figur atau klien yang memakai koleksimu — tampil di beranda.</p>
        <button type="button" className="btn-primary shrink-0" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Tambah
        </button>
      </div>
      {isPending ? (
        <div className="skeleton h-40" />
      ) : !data?.length ? (
        <Empty title="Belum ada data." body="Tambahkan foto klien atau figur yang memakai koleksimu (dengan izin mereka)." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {data.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setEditing(s)} className={cx('group block w-full rounded-xs text-left', !s.isActive && 'opacity-60')}>
                <div className="relative overflow-hidden rounded-xs">
                  <Img src={s.thumbnailUrl} blur={s.blurDataUrl} alt={s.name} intrinsic={false} className="aspect-[4/5]" />
                  <div className="absolute inset-x-0 top-0 bg-linear-to-b from-noir/60 to-transparent p-3">
                    <p className="script text-[1.6rem] leading-none text-blush">{s.name}</p>
                  </div>
                </div>
                <p className="mt-1.5 truncate text-xs text-muted">{s.photo ? `↗ ${s.photo.title}` : 'Tanpa tautan produk'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} eyebrow="Worn By" title={editing === 'new' ? 'Tambah figur' : 'Ubah'}>
        {editing && <ShowcaseForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  )
}

function ShowcaseForm({ item, onDone }: { item: ShowcaseDTO | null; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [caption, setCaption] = useState(item?.caption ?? '')
  const [photo, setPhoto] = useState(item?.photo ?? null)
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)
  const results = useAdminPhotos({ q: q || undefined, kind: 'gown' })
  const toast = useToast()
  const invalidate = useInvalidateSite()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!item && !file) return toast('Pilih foto terlebih dahulu', { tone: 'error' })
    setBusy(true)
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('caption', caption)
      form.append('photoId', photo?.id ?? '')
      form.append('sortOrder', sortOrder || '0')
      form.append('isActive', String(isActive))
      if (file) form.append('file', await prepareForUpload(file))
      await uploadWithProgress(item ? `/admin/showcases/${item.id}` : '/admin/showcases', form, { method: item ? 'PATCH' : 'POST' })
      invalidate()
      toast('Tersimpan')
      onDone()
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/admin/showcases/${item!.id}`, { method: 'DELETE' })
      invalidate()
      toast('Dihapus')
      onDone()
    } catch (err) {
      toast((err as Error).message, { tone: 'error' })
      setBusy(false)
    }
  }

  const options = results.data?.pages[0]?.items.slice(0, 6) ?? []

  return (
    <form onSubmit={submit} className="space-y-5 pb-6">
      <ImagePickField label="Foto" required current={item?.thumbnailUrl ?? null} file={file} onFile={setFile} />
      <div>
        <label htmlFor="s-name" className="field-label">
          Nama
        </label>
        <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required data-autofocus />
      </div>
      <div>
        <label htmlFor="s-cap" className="field-label">
          Keterangan <span className="font-normal text-muted">(opsional)</span>
        </label>
        <input id="s-cap" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="mis. Konser tur 2026" />
      </div>
      <div>
        <p className="field-label">Gaun yang dipakai</p>
        {photo ? (
          <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-paper/70 px-3 py-2">
            <span className="truncate">{photo.title}</span>
            <button type="button" className="icon-btn size-9" onClick={() => setPhoto(null)} aria-label="Lepas tautan">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <label className="relative block">
              <span className="sr-only">Cari gaun</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul gaun…" />
            </label>
            {search && (
              <ul className="mt-2 divide-y divide-line rounded-sm border border-line bg-paper">
                {options.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blush/30" onClick={() => setPhoto({ id: p.id, slug: p.slug, title: p.title })}>
                      <Img src={p.thumbnailUrl} alt="" intrinsic={false} className="size-10 shrink-0 rounded-xs" />
                      <span className="truncate">{p.title}</span>
                    </button>
                  </li>
                ))}
                {!options.length && <li className="px-3 py-2 text-sm text-muted">Tidak ditemukan</li>}
              </ul>
            )}
          </>
        )}
      </div>
      <div>
        <label htmlFor="s-order" className="field-label">
          Urutan
        </label>
        <input id="s-order" className="input w-28" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d]/g, ''))} />
      </div>
      <Toggle checked={isActive} onChange={setIsActive} title="Tampilkan" hint="Muncul di beranda" />
      <div className="flex gap-3 pt-2">
        {item && (
          <button type="button" className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Hapus
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={busy || !name.trim()}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
      <ConfirmDialog open={confirm} title={`Hapus ${item?.name ?? ''}?`} description="Foto akan dihapus dari bagian Worn By." confirmLabel="Hapus" busy={busy} onCancel={() => setConfirm(false)} onConfirm={remove} />
    </form>
  )
}
