import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Search, Tag as TagIcon } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { keys, useTags } from '@/lib/queries'
import { cx } from '@/lib/format'
import type { AdminCategory } from '@shared/types'

type Props = {
  open: boolean
  onClose: () => void
  value: string[]
  onChange: (ids: string[]) => void
  title?: string
  confirmLabel?: string
  onConfirm?: () => void
  busy?: boolean
}

/** Pemilih banyak tag, dikelompokkan per kategori, dengan pencarian & tambah-cepat. */
export function TagPicker({ open, onClose, value, onChange, title = 'Pilih tag', confirmLabel, onConfirm, busy }: Props) {
  const { data: categories, isPending } = useTags()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!categories) return []
    if (!term) return categories
    return categories
      .map((c) => ({ ...c, tags: c.tags.filter((t) => t.name.toLowerCase().includes(term)) }))
      .filter((c) => c.tags.length || c.name.toLowerCase().includes(term))
  }, [categories, search])

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={value.length ? `${value.length} dipilih` : undefined}
      title={title}
      footer={
        <div className="flex gap-3">
          {value.length > 0 && (
            <button type="button" className="btn-ghost" onClick={() => onChange([])}>
              Kosongkan
            </button>
          )}
          <button type="button" className="btn-primary flex-1" onClick={onConfirm ?? onClose} disabled={busy}>
            {busy ? 'Menyimpan…' : (confirmLabel ?? 'Selesai')}
          </button>
        </div>
      }
    >
      <label className="relative mb-6 block">
        <span className="sr-only">Cari tag</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-10"
          placeholder="Cari tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {isPending ? (
        <p className="py-8 text-center text-muted">Memuat tag…</p>
      ) : !categories?.length ? (
        <p className="py-8 text-center text-ink-soft">
          Belum ada kategori tag. Buat dulu di menu <strong>Tag</strong>.
        </p>
      ) : (
        <div className="space-y-7 pb-4">
          {filtered.map((cat) => (
            <CategoryBlock key={cat.id} category={cat} value={value} onToggle={toggle} onCreated={(id) => onChange([...value, id])} />
          ))}
        </div>
      )}
    </Sheet>
  )
}

function CategoryBlock({
  category,
  value,
  onToggle,
  onCreated,
}: {
  category: AdminCategory
  value: string[]
  onToggle: (id: string) => void
  onCreated: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const qc = useQueryClient()
  const toast = useToast()
  const create = useMutation({
    mutationFn: () => api<{ id: string }>('/admin/tags', { method: 'POST', body: { name, categoryId: category.id } }),
    onSuccess: (tag) => {
      qc.invalidateQueries({ queryKey: keys.tags })
      qc.invalidateQueries({ queryKey: ['filters'] })
      onCreated(tag.id)
      setName('')
      setAdding(false)
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  return (
    <fieldset>
      <legend className="display mb-3 text-[1.35rem] leading-none italic">{category.name}</legend>
      <div className="flex flex-wrap gap-2">
        {category.tags.map((t) => {
          const on = value.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t.id)}
              className={cx('chip', !t.isActive && 'opacity-60')}
              title={t.isActive ? undefined : 'Tag nonaktif — tidak tampil di filter publik'}
            >
              {on && <Check className="size-3.5" strokeWidth={2.25} />}
              {t.name}
            </button>
          )
        })}
        {adding ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) create.mutate()
            }}
          >
            <input
              autoFocus
              className="input min-h-10 w-36 py-1 text-[0.9375rem]"
              placeholder="Nama tag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !name && setAdding(false)}
              maxLength={40}
            />
            <button type="submit" className="btn-primary min-h-10 px-3" disabled={!name.trim() || create.isPending} aria-label="Simpan tag">
              <Check className="size-4" />
            </button>
          </form>
        ) : (
          <button type="button" className="chip border-dashed text-muted" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> Baru
          </button>
        )}
      </div>
    </fieldset>
  )
}

/** Tombol ringkasan tag terpilih yang membuka TagPicker. */
export function TagField({ value, onChange, label = 'Tag' }: { value: string[]; onChange: (ids: string[]) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const { data: categories } = useTags()
  const names = useMemo(() => {
    const all = categories?.flatMap((c) => c.tags.map((t) => ({ ...t, cat: c.name }))) ?? []
    return value.map((id) => all.find((t) => t.id === id)).filter(Boolean) as { id: string; name: string; cat: string }[]
  }, [categories, value])

  return (
    <div>
      <p className="field-label">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-sm border border-line bg-paper/80 p-2 text-left transition-colors hover:border-line-strong"
      >
        {names.length ? (
          <>
            {names.map((t) => (
              <span key={t.id} className="rounded-xs bg-blush/60 px-2 py-1 text-sm text-ink">
                {t.name}
              </span>
            ))}
            <span className="ml-auto px-2 text-sm text-plum">Ubah</span>
          </>
        ) : (
          <span className="flex items-center gap-2 px-1.5 text-muted">
            <TagIcon className="size-4" strokeWidth={1.5} /> Tambahkan tag — model, ukuran, warna…
          </span>
        )}
      </button>
      <TagPicker open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} />
    </div>
  )
}
