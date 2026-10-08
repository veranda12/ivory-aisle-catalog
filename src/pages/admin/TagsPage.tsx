import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { AdminHeader } from './AdminLayout'
import { useTags } from '@/lib/queries'
import { api } from '@/lib/api'
import { cx } from '@/lib/format'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Empty } from '@/components/ui/Reveal'
import { useToast } from '@/components/ui/Toast'
import type { AdminCategory, AdminTag } from '@shared/types'

type Editing =
  | { kind: 'category'; category?: AdminCategory }
  | { kind: 'tag'; tag?: AdminTag; categoryId: string }
  | null

type Deleting = { kind: 'category'; item: AdminCategory } | { kind: 'tag'; item: AdminTag } | null

const SILK = [0.22, 1, 0.36, 1] as const

export default function TagsPage() {
  const { data: categories, isPending, isError, refetch } = useTags()
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Deleting>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: ['filters'] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
  }

  const toggleActive = useMutation({
    mutationFn: (tag: AdminTag) => api(`/admin/tags/${tag.id}`, { method: 'PATCH', body: { isActive: !tag.isActive } }),
    onMutate: async (tag) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['admin', 'tags'] })
      qc.setQueryData<AdminCategory[]>(['admin', 'tags'], (old) =>
        old?.map((c) => ({ ...c, tags: c.tags.map((t) => (t.id === tag.id ? { ...t, isActive: !t.isActive } : t)) })),
      )
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
    onSettled: invalidate,
  })

  const remove = useMutation({
    mutationFn: (d: NonNullable<Deleting>) =>
      api(`/admin/${d.kind === 'category' ? 'categories' : 'tags'}/${d.item.id}`, { method: 'DELETE' }),
    onSuccess: (_r, d) => {
      toast(d.kind === 'category' ? 'Kategori dihapus' : 'Tag dihapus')
      setDeleting(null)
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
    onSettled: invalidate,
  })

  const tagCount = categories?.reduce((s, c) => s + c.tags.length, 0) ?? 0

  return (
    <div>
      <AdminHeader
        eyebrow={categories ? `${categories.length} kategori · ${tagCount} tag` : 'Memuat…'}
        title="Tag"
        actions={
          <button type="button" className="btn-secondary" onClick={() => setEditing({ kind: 'category' })}>
            <Plus className="size-4" strokeWidth={1.5} /> Kategori
          </button>
        }
      />
      <p className="-mt-2 mb-6 max-w-xl px-4 text-ink-soft sm:px-6 lg:px-10">
        Tag dikelompokkan per kategori. Pengunjung bisa memilih beberapa tag sekaligus untuk menyaring katalog.
      </p>

      <div className="px-4 sm:px-6 lg:px-10">
        {isError ? (
          <Empty title="Gagal memuat tag." body="Coba lagi sebentar." action={<button className="btn-secondary" onClick={() => refetch()}>Coba lagi</button>} />
        ) : isPending ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton h-8 w-32" />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="skeleton h-12" />
                ))}
              </div>
            ))}
          </div>
        ) : !categories?.length ? (
          <Empty
            title="Belum ada kategori."
            body="Mulai dengan kategori seperti Model, Ukuran, atau Warna."
            action={
              <button className="btn-primary" onClick={() => setEditing({ kind: 'category' })}>
                <Plus className="size-4" /> Buat kategori
              </button>
            }
          />
        ) : (
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat, ci) => (
              <motion.section
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: SILK, delay: ci * 0.05 }}
                aria-labelledby={`cat-${cat.id}`}
              >
                <div className="flex items-end justify-between border-b border-ink/80 pb-2">
                  <div>
                    <h2 id={`cat-${cat.id}`} className="display text-[1.9rem] leading-none italic">
                      {cat.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted">/{cat.slug} · {cat.tags.length} tag</p>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setEditing({ kind: 'category', category: cat })} aria-label={`Ubah kategori ${cat.name}`}>
                    <Pencil className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {cat.tags.map((t) => (
                      <motion.li
                        key={t.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: SILK }}
                        className="border-b border-line"
                      >
                        <div className="flex min-h-14 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditing({ kind: 'tag', tag: t, categoryId: cat.id })}
                            className="min-w-0 flex-1 truncate py-3 text-left"
                          >
                            <span className={cx(!t.isActive && 'text-muted line-through decoration-line-strong')}>{t.name}</span>
                          </button>
                          <Link to={`/admin/photos?tag=${t.id}`} className="shrink-0 rounded-sm px-1 py-2 text-xs text-muted hover:text-plum">
                            {t.photoCount} foto
                          </Link>
                          <Switch checked={t.isActive} onChange={() => toggleActive.mutate(t)} label={`${t.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${t.name}`} />
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <button
                  type="button"
                  className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-sm text-sm font-semibold text-plum hover:bg-blush/30"
                  onClick={() => setEditing({ kind: 'tag', categoryId: cat.id })}
                >
                  <Plus className="size-4" /> Tambah tag
                </button>
              </motion.section>
            ))}
          </div>
        )}
      </div>

      <EditSheet
        editing={editing}
        categories={categories ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          invalidate()
          setEditing(null)
        }}
        onDelete={(d) => {
          setEditing(null)
          setDeleting(d)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title={deleting?.kind === 'category' ? `Hapus kategori ${deleting.item.name}?` : `Hapus tag ${deleting?.item.name ?? ''}?`}
        description={
          deleting?.kind === 'category'
            ? `Semua ${deleting.item.tags.length} tag di dalamnya ikut terhapus dan dilepas dari foto. Fotonya sendiri tetap ada.`
            : `Tag ini akan dilepas dari ${deleting?.kind === 'tag' ? deleting.item.photoCount : 0} foto. Fotonya sendiri tetap ada.`
        }
        confirmLabel="Hapus"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span className={cx('relative h-6 w-10 rounded-full transition-colors duration-300', checked ? 'bg-plum' : 'bg-line-strong')}>
        <motion.span
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-paper shadow-soft"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ duration: 0.3, ease: SILK }}
        />
      </span>
    </button>
  )
}

function EditSheet({
  editing,
  categories,
  onClose,
  onSaved,
  onDelete,
}: {
  editing: Editing
  categories: AdminCategory[]
  onClose: () => void
  onSaved: () => void
  onDelete: (d: NonNullable<Deleting>) => void
}) {
  const toast = useToast()
  const key = editing ? `${editing.kind}-${editing.kind === 'tag' ? editing.tag?.id : editing.category?.id}` : 'none'
  return (
    <Sheet
      open={!!editing}
      onClose={onClose}
      eyebrow={editing?.kind === 'category' ? 'Kategori' : 'Tag'}
      title={
        editing?.kind === 'category'
          ? editing.category
            ? 'Ubah kategori'
            : 'Kategori baru'
          : editing?.tag
            ? 'Ubah tag'
            : 'Tag baru'
      }
    >
      {editing && <EditForm key={key} editing={editing} categories={categories} onSaved={onSaved} onDelete={onDelete} toast={toast} />}
    </Sheet>
  )
}

function EditForm({
  editing,
  categories,
  onSaved,
  onDelete,
  toast,
}: {
  editing: NonNullable<Editing>
  categories: AdminCategory[]
  onSaved: () => void
  onDelete: (d: NonNullable<Deleting>) => void
  toast: ReturnType<typeof useToast>
}) {
  const existing = editing.kind === 'category' ? editing.category : editing.tag
  const [name, setName] = useState(existing?.name ?? '')
  const [slug, setSlug] = useState(existing?.slug ?? '')
  const [categoryId, setCategoryId] = useState(editing.kind === 'tag' ? editing.categoryId : '')
  const [isActive, setIsActive] = useState(editing.kind === 'tag' ? (editing.tag?.isActive ?? true) : true)
  const [another, setAnother] = useState(false)

  const save = useMutation({
    mutationFn: () => {
      const base = editing.kind === 'category' ? '/admin/categories' : '/admin/tags'
      const body =
        editing.kind === 'category' ? { name, slug: slug || undefined } : { name, slug: slug || undefined, categoryId, isActive }
      return existing ? api(`${base}/${existing.id}`, { method: 'PATCH', body }) : api(base, { method: 'POST', body })
    },
    onSuccess: () => {
      toast(existing ? 'Tersimpan' : `"${name}" ditambahkan`)
      if (another && !existing) {
        setName('')
        setSlug('')
        return
      }
      onSaved()
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) save.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-6">
      <div>
        <label htmlFor="name" className="field-label">
          Nama
        </label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
          data-autofocus
          placeholder={editing.kind === 'category' ? 'mis. Warna' : 'mis. Dusty Pink'}
        />
      </div>
      <div>
        <label htmlFor="slug" className="field-label">
          Slug <span className="font-normal text-muted">(opsional, untuk URL)</span>
        </label>
        <input id="slug" className="input" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={60} placeholder="otomatis dari nama" />
      </div>
      {editing.kind === 'tag' && (
        <>
          <div>
            <label htmlFor="cat" className="field-label">
              Kategori
            </label>
            <select id="cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-sm border border-line bg-paper/60 px-4">
            <span>
              <span className="block font-semibold">Aktif</span>
              <span className="text-sm text-muted">Tag nonaktif tidak muncul di filter publik</span>
            </span>
            <input type="checkbox" className="size-5 accent-plum" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          </label>
        </>
      )}
      {!existing && (
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="size-4 accent-plum" checked={another} onChange={(e) => setAnother(e.target.checked)} />
          Tambah lagi setelah simpan
        </label>
      )}
      <div className="flex gap-3 pt-2">
        {existing && (
          <button
            type="button"
            className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() =>
              editing.kind === 'category'
                ? onDelete({ kind: 'category', item: editing.category! })
                : onDelete({ kind: 'tag', item: editing.tag! })
            }
          >
            Hapus
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={!name.trim() || save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}
