import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { BookMarked, CheckCircle2, Circle, EyeOff, Eye, Plus, Search, SlidersHorizontal, Star, Tag as TagIcon, Trash2, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminHeader } from './AdminLayout'
import { useAdminChapters, useAdminPhotos, useTags } from '@/lib/queries'
import { useDebounced } from '@/lib/hooks'
import { api } from '@/lib/api'
import { cx } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Empty } from '@/components/ui/Reveal'
import { useToast } from '@/components/ui/Toast'
import { TagPicker } from '@/components/admin/TagPicker'
import type { AdminPhotoDTO } from '@shared/types'

const SORTS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'az', label: 'A–Z' },
  { value: 'za', label: 'Z–A' },
]
const STATUSES = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Tampil' },
  { value: 'hidden', label: 'Tersembunyi' },
  { value: 'featured', label: 'Unggulan' },
]
const KINDS = [
  { value: 'all', label: 'Semua' },
  { value: 'gown', label: 'Gaun' },
  { value: 'addon', label: 'Add-on' },
]

const SILK = [0.22, 1, 0.36, 1] as const

export default function PhotosPage() {
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const status = params.get('status') ?? 'all'
  const kind = params.get('kind') ?? 'all'
  const chapterId = params.get('chapter') ?? ''
  const [chapterPicker, setChapterPicker] = useState(false)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounced(search.trim(), 300)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagPicker, setTagPicker] = useState<null | 'addTags' | 'removeTags'>(null)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const qc = useQueryClient()
  const toast = useToast()
  const { data: categories } = useTags()
  const { data: chapters } = useAdminChapters()

  const setParam = (key: string, value: string, fallback: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!value || value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  useEffect(() => setParam('q', q, ''), [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useAdminPhotos({ q: q || undefined, tag: tag || undefined, sort, status, kind, chapter: chapterId || undefined })
  const photos = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])
  const total = list.data?.pages[0]?.total ?? 0

  const tagName = useMemo(() => {
    if (tag === 'none') return 'Tanpa tag'
    for (const c of categories ?? []) for (const t of c.tags) if (t.id === tag) return `${c.name}: ${t.name}`
    return ''
  }, [tag, categories])

  // Infinite scroll
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage()
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [list])

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exitSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
    qc.invalidateQueries({ queryKey: ['filters'] })
    qc.invalidateQueries({ queryKey: ['site'] })
  }

  const bulk = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ count: number }>('/admin/photos/bulk', { method: 'POST', body: { ...body, ids: [...selected] } }),
    onMutate: (body) => {
      // Optimistic: hilangkan foto yang dihapus dari grid seketika.
      if (body.action === 'delete') {
        qc.setQueriesData<{ pages: { items: AdminPhotoDTO[]; total: number }[] }>({ queryKey: ['admin', 'photos'] }, (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((p) => ({
                  ...p,
                  items: p.items.filter((i) => !selected.has(i.id)),
                  total: p.total - selected.size,
                })),
              }
            : old,
        )
      }
    },
    onSuccess: (_res, body) => {
      const n = selected.size
      const msg =
        body.action === 'delete'
          ? `${n} foto dihapus`
          : body.action === 'setActive'
            ? body.isActive
              ? `${n} foto ditampilkan`
              : `${n} foto disembunyikan`
            : body.action === 'setChapter'
              ? `${n} foto dipindahkan`
              : body.action === 'addTags'
              ? `Tag ditambahkan ke ${n} foto`
              : `Tag dilepas dari ${n} foto`
      toast(msg)
      setConfirmDelete(false)
      setTagPicker(null)
      setBulkTags([])
      exitSelect()
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
    onSettled: invalidate,
  })

  const activeFilterCount = (tag ? 1 : 0) + (status !== 'all' ? 1 : 0) + (sort !== 'newest' ? 1 : 0) + (kind !== 'all' ? 1 : 0) + (chapterId ? 1 : 0)
  const chapterName = chapterId === 'none' ? 'Tanpa chapter' : chapters?.find((c) => c.id === chapterId)?.name

  return (
    <div>
      <AdminHeader
        eyebrow={list.isPending ? 'Memuat…' : `${total} foto`}
        title="Foto"
        actions={
          <>
            {photos.length > 0 && (
              <button type="button" className="btn-ghost" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
                {selecting ? 'Batal' : 'Pilih'}
              </button>
            )}
            <Link to="/admin/photos/new" className="btn-primary hidden lg:inline-flex">
              <Plus className="size-5" strokeWidth={1.5} /> Tambah
            </Link>
          </>
        }
      />

      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b border-line/70 bg-canvas/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Cari foto</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input type="search" className="input pl-10" placeholder="Cari judul, koleksi, tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <button
            type="button"
            className={cx('btn-secondary relative px-4', activeFilterCount > 0 && 'border-plum text-plum')}
            onClick={() => setFilterOpen(true)}
            aria-label="Filter & urutan"
          >
            <SlidersHorizontal className="size-[18px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-plum text-[0.7rem] text-paper">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        {(tagName || status !== 'all' || kind !== 'all' || chapterName) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {kind !== 'all' && (
              <button type="button" className="chip min-h-8 border-plum/40 bg-blush/40 text-sm text-ink" onClick={() => setParam('kind', 'all', 'all')}>
                {KINDS.find((k) => k.value === kind)?.label} <X className="size-3.5" />
              </button>
            )}
            {chapterName && (
              <button type="button" className="chip min-h-8 border-plum/40 bg-blush/40 text-sm text-ink" onClick={() => setParam('chapter', '', '')}>
                {chapterName} <X className="size-3.5" />
              </button>
            )}
            {tagName && (
              <button type="button" className="chip min-h-8 border-plum/40 bg-blush/40 text-sm text-ink" onClick={() => setParam('tag', '', '')}>
                {tagName} <X className="size-3.5" />
              </button>
            )}
            {status !== 'all' && (
              <button type="button" className="chip min-h-8 border-plum/40 bg-blush/40 text-sm text-ink" onClick={() => setParam('status', 'all', 'all')}>
                {STATUSES.find((s) => s.value === status)?.label} <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 pt-5 sm:px-6 lg:px-10">
        {list.isError ? (
          <Empty title="Gagal memuat foto." body="Periksa koneksi lalu coba lagi." action={<button className="btn-secondary" onClick={() => list.refetch()}>Coba lagi</button>} />
        ) : list.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4]" />
                <div className="skeleton mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          q || tag || status !== 'all' || kind !== 'all' || chapterId ? (
            <Empty
              title="Tidak ada yang cocok."
              body="Coba kata kunci lain atau lepas filternya."
              action={
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch('')
                    setParams({}, { replace: true })
                  }}
                >
                  Hapus filter
                </button>
              }
            />
          ) : (
            <Empty
              title="Belum ada look."
              body="Koleksimu menunggu foto pertamanya."
              action={
                <Link to="/admin/photos/new" className="btn-primary">
                  <Plus className="size-5" strokeWidth={1.5} /> Tambah foto
                </Link>
              }
            />
          )
        ) : (
          <ul className={cx('grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6', list.isPlaceholderData && 'opacity-60')}>
            <AnimatePresence initial={false}>
              {photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={i}
                  selecting={selecting}
                  selected={selected.has(p.id)}
                  onToggle={() => toggleSelect(p.id)}
                  onLongPress={() => {
                    setSelecting(true)
                    toggleSelect(p.id)
                  }}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
        <div ref={sentinel} className="h-px" />
        {list.isFetchingNextPage && <p className="py-6 text-center text-sm text-muted">Memuat lagi…</p>}
      </div>

      {/* Bar aksi massal */}
      <AnimatePresence>
        {selecting && (
          <BulkBar
            count={selected.size}
            allCount={photos.length}
            onSelectAll={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
            onTag={() => setTagPicker('addTags')}
            onChapter={() => setChapterPicker(true)}
            onUntag={() => setTagPicker('removeTags')}
            onShow={() => bulk.mutate({ action: 'setActive', isActive: true })}
            onHide={() => bulk.mutate({ action: 'setActive', isActive: false })}
            onDelete={() => setConfirmDelete(true)}
            busy={bulk.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filter & urutan */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter & urutan" footer={<button className="btn-primary w-full" onClick={() => setFilterOpen(false)}>Tampilkan {total} foto</button>}>
        <div className="space-y-7 pb-4">
          <fieldset>
            <legend className="display mb-3 text-[1.35rem] italic">Urutkan</legend>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <button key={s.value} type="button" className="chip" aria-pressed={sort === s.value} onClick={() => setParam('sort', s.value, 'newest')}>
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="display mb-3 text-[1.35rem] italic">Jenis</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button key={k.value} type="button" className="chip" aria-pressed={kind === k.value} onClick={() => setParam('kind', k.value, 'all')}>
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="display mb-3 text-[1.35rem] italic">Chapter</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={!chapterId} onClick={() => setParam('chapter', '', '')}>
                Semua
              </button>
              <button type="button" className="chip" aria-pressed={chapterId === 'none'} onClick={() => setParam('chapter', 'none', '')}>
                Tanpa chapter
              </button>
              {chapters?.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={chapterId === c.id} onClick={() => setParam('chapter', chapterId === c.id ? '' : c.id, '')}>
                  {c.name} <span className="text-xs opacity-70">{c.photoCount}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="display mb-3 text-[1.35rem] italic">Status</legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s.value} type="button" className="chip" aria-pressed={status === s.value} onClick={() => setParam('status', s.value, 'all')}>
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="display mb-3 text-[1.35rem] italic">Tag</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={!tag} onClick={() => setParam('tag', '', '')}>
                Semua
              </button>
              <button type="button" className="chip" aria-pressed={tag === 'none'} onClick={() => setParam('tag', 'none', '')}>
                Tanpa tag
              </button>
            </div>
            {categories?.map((c) => (
              <div key={c.id} className="mt-4">
                <p className="eyebrow mb-2">{c.name}</p>
                <div className="flex flex-wrap gap-2">
                  {c.tags.map((t) => (
                    <button key={t.id} type="button" className="chip" aria-pressed={tag === t.id} onClick={() => setParam('tag', tag === t.id ? '' : t.id, '')}>
                      {t.name} <span className="text-xs opacity-70">{t.photoCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        </div>
      </Sheet>

      <TagPicker
        open={!!tagPicker}
        onClose={() => {
          setTagPicker(null)
          setBulkTags([])
        }}
        value={bulkTags}
        onChange={setBulkTags}
        title={tagPicker === 'removeTags' ? `Lepas tag dari ${selected.size} foto` : `Tambah tag ke ${selected.size} foto`}
        confirmLabel={tagPicker === 'removeTags' ? `Lepas ${bulkTags.length} tag` : `Terapkan ${bulkTags.length} tag`}
        onConfirm={() => bulkTags.length && bulk.mutate({ action: tagPicker, tagIds: bulkTags })}
        busy={bulk.isPending}
      />

      <Sheet open={chapterPicker} onClose={() => setChapterPicker(false)} eyebrow={`${selected.size} foto`} title="Pindahkan ke chapter" variant="bottom">
        <div className="flex flex-col pb-4">
          {[{ id: null as string | null, name: 'Tanpa chapter', numeral: null as string | null }, ...(chapters ?? [])].map((c) => (
            <button
              key={c.id ?? 'none'}
              type="button"
              disabled={bulk.isPending}
              onClick={() => {
                bulk.mutate({ action: 'setChapter', chapterId: c.id })
                setChapterPicker(false)
              }}
              className="flex min-h-14 items-center gap-3 border-b border-line text-left hover:text-plum"
            >
              <span className="w-8 font-display text-lg text-gold italic">{c.numeral}</span>
              <span className="font-display text-xl">{c.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={selected.size === 1 ? 'Hapus look ini?' : `Hapus ${selected.size} look?`}
        description={`${selected.size === 1 ? 'Foto ini' : `${selected.size} foto ini`} akan dihapus dari katalog secara permanen.`}
        confirmLabel={`Hapus ${selected.size} foto`}
        busy={bulk.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => bulk.mutate({ action: 'delete' })}
      />
    </div>
  )
}

function PhotoTile({
  photo,
  index,
  selecting,
  selected,
  onToggle,
  onLongPress,
}: {
  photo: AdminPhotoDTO
  index: number
  selecting: boolean
  selected: boolean
  onToggle: () => void
  onLongPress: () => void
}) {
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const start = () => {
    longPressed.current = false
    timer.current = window.setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(12)
      onLongPress()
    }, 480)
  }
  const cancel = () => clearTimeout(timer.current)

  const content = (
    <>
      <div className={cx('relative overflow-hidden rounded-xs transition-transform duration-300 ease-(--ease-silk)', selected && 'scale-[0.94]')}>
        <Img src={photo.thumbnailUrl} blur={photo.blurDataUrl} alt={photo.title} intrinsic={false} className="aspect-[3/4]" />
        {!photo.isActive && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-xs bg-ink/75 px-1.5 py-0.5 text-[0.7rem] text-paper">
            <EyeOff className="size-3" /> Tersembunyi
          </span>
        )}
        {(photo.kind === 'ADDON' || photo.isFeatured) && (
          <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-xs bg-paper/90 px-1.5 py-0.5 text-[0.7rem] text-plum">
            {photo.isFeatured && <Star className="size-3 fill-current" />}
            {photo.kind === 'ADDON' ? 'Add-on' : 'Unggulan'}
          </span>
        )}
        {photo.tags.length === 0 && photo.kind === 'GOWN' && (
          <span className="absolute top-1.5 left-1.5 rounded-xs bg-paper/90 px-1.5 py-0.5 text-[0.7rem] text-berry">Tanpa tag</span>
        )}
        {selecting && (
          <span className={cx('absolute top-1.5 right-1.5 rounded-full', selected ? 'text-plum' : 'text-paper drop-shadow')}>
            {selected ? <CheckCircle2 className="size-7 fill-paper" strokeWidth={1.75} /> : <Circle className="size-7" strokeWidth={1.75} />}
          </span>
        )}
        {selected && <span className="pointer-events-none absolute inset-0 ring-2 ring-plum ring-inset" />}
      </div>
      <p className="mt-1.5 truncate text-sm">{photo.title}</p>
      <p className="truncate text-xs text-muted">{photo.tags.length ? photo.tags.map((t) => t.name).join(' · ') : '—'}</p>
    </>
  )

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
      transition={{ duration: 0.5, ease: SILK, delay: Math.min(index, 12) * 0.02 }}
    >
      {selecting ? (
        <button type="button" onClick={onToggle} aria-pressed={selected} className="block w-full rounded-xs text-left" aria-label={`Pilih ${photo.title}`}>
          {content}
        </button>
      ) : (
        <Link
          to={`/admin/photos/${photo.id}`}
          className="block rounded-xs select-none [-webkit-touch-callout:none]"
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            if (longPressed.current) e.preventDefault()
          }}
        >
          {content}
        </Link>
      )}
    </motion.li>
  )
}

function BulkBar(props: {
  count: number
  allCount: number
  onSelectAll: () => void
  onTag: () => void
  onChapter: () => void
  onUntag: () => void
  onShow: () => void
  onHide: () => void
  onDelete: () => void
  busy: boolean
}) {
  const disabled = props.count === 0 || props.busy
  return (
    <motion.div
      initial={{ y: 120 }}
      animate={{ y: 0 }}
      exit={{ y: 120 }}
      transition={{ duration: 0.45, ease: SILK }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper pb-safe shadow-sheet lg:left-[248px]"
    >
      <div className="flex items-center justify-between px-4 pt-3 sm:px-6">
        <p className="font-semibold">{props.count} dipilih</p>
        <button type="button" className="text-sm text-plum underline-offset-4 hover:underline" onClick={props.onSelectAll}>
          {props.count === props.allCount ? 'Batalkan semua' : 'Pilih semua'}
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1 px-2 py-2 sm:px-4">
        <BulkAction icon={TagIcon} label="Tag" onClick={props.onTag} disabled={disabled} />
        <BulkAction icon={BookMarked} label="Chapter" onClick={props.onChapter} disabled={disabled} />
        <BulkAction icon={X} label="Lepas tag" onClick={props.onUntag} disabled={disabled} />
        <BulkAction icon={Eye} label="Tampilkan" onClick={props.onShow} disabled={disabled} />
        <BulkAction icon={EyeOff} label="Sembunyikan" onClick={props.onHide} disabled={disabled} />
        <BulkAction icon={Trash2} label="Hapus" onClick={props.onDelete} disabled={disabled} danger />
      </div>
    </motion.div>
  )
}

function BulkAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof TagIcon
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm text-[0.7rem] font-semibold transition-colors disabled:opacity-40',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-soft hover:bg-mist/60',
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} />
      {label}
    </button>
  )
}
