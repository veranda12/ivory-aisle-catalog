import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, Plus, TagIcon } from 'lucide-react'
import { useMe, useStats } from '@/lib/queries'
import { formatBytes, greeting, relativeDay } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Empty } from '@/components/ui/Reveal'
import type { AdminPhotoDTO } from '@shared/types'

const SILK = [0.22, 1, 0.36, 1] as const

export default function DashboardPage() {
  const { data: me } = useMe()
  const { data: stats, isPending, isError, refetch } = useStats()
  const name = me?.name || me?.email.split('@')[0]

  return (
    <div className="px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: SILK }}>
        <p className="eyebrow mb-2">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="display text-[2.6rem] leading-[0.95] lg:text-[3.75rem]">
          {greeting()}, <em className="text-plum">{name}</em>.
        </h1>
      </motion.header>

      {isError ? (
        <Empty
          title="Dashboard belum bisa dimuat."
          body="Periksa koneksi lalu coba lagi."
          action={
            <button className="btn-secondary" onClick={() => refetch()}>
              Coba lagi
            </button>
          }
        />
      ) : (
        <>
          {/* Angka utama */}
          <section aria-label="Ringkasan koleksi" className="mt-8 border-y border-line py-6 lg:mt-12 lg:py-8">
            <p className="eyebrow mb-4">Koleksimu</p>
            <dl className="grid grid-cols-3 gap-4 lg:grid-cols-4">
              <Stat label="Look" value={stats?.totalPhotos} sub={stats ? `${stats.activePhotos} tampil` : undefined} delay={0} />
              <Stat label="Chapter" value={stats?.totalChapters} sub={stats ? `${stats.totalAddons} add-on · ${stats.totalTags} tag` : undefined} delay={0.08} />
              <Stat label="Minggu ini" value={stats?.addedThisWeek} sub="baru diunggah" delay={0.16} />
              <div className="hidden lg:block">
                <dt className="text-sm text-muted">Penyimpanan</dt>
                <dd className="display mt-1 text-[2.5rem] leading-none lining-nums">{stats ? formatBytes(stats.storageBytes) : '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Perlu perhatian */}
          {stats && stats.untaggedCount > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: SILK, delay: 0.25 }}
              className="mt-6 flex items-center gap-4 rounded-md bg-blush/50 p-4 lg:p-5"
            >
              <div className="flex -space-x-3">
                {stats.untagged.slice(0, 3).map((p) => (
                  <Img key={p.id} src={p.thumbnailUrl} alt="" intrinsic={false} className="size-12 rounded-sm border-2 border-paper" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{stats.untaggedCount} foto belum punya tag</p>
                <p className="text-sm text-ink-soft">Tanpa tag, foto ini tidak muncul saat pengunjung memfilter.</p>
              </div>
              <Link to="/admin/photos?tag=none" className="icon-btn bg-paper" aria-label="Lihat foto tanpa tag">
                <ArrowRight className="size-5" strokeWidth={1.5} />
              </Link>
            </motion.section>
          )}

          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[1fr_320px]">
            {/* Baru diunggah */}
            <section aria-labelledby="recent-title">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 id="recent-title" className="display text-[1.9rem] leading-none italic">
                  Baru ditambahkan
                </h2>
                <Link to="/admin/photos" className="text-sm text-plum underline-offset-4 hover:underline">
                  Semua foto
                </Link>
              </div>
              {isPending ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:gap-3">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="skeleton aspect-[3/4]" />
                  ))}
                </div>
              ) : stats?.recent.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:gap-3">
                  {stats.recent.map((p, i) => (
                    <RecentTile key={p.id} photo={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-line-strong px-6 py-12 text-center">
                  <p className="display text-[2rem] italic">Belum ada look.</p>
                  <p className="mt-2 text-ink-soft">Koleksimu menunggu foto pertamanya.</p>
                  <Link to="/admin/photos/new" className="btn-primary mt-6">
                    <Plus className="size-5" strokeWidth={1.5} /> Tambah foto
                  </Link>
                </div>
              )}
            </section>

            {/* Tag terpopuler */}
            <aside aria-labelledby="top-tags-title">
              <h2 id="top-tags-title" className="display mb-5 text-[1.9rem] leading-none italic">
                Tag paling sering
              </h2>
              {stats?.topTags.length ? (
                <ol className="space-y-3">
                  {stats.topTags.map((t) => {
                    const pct = stats.totalPhotos ? Math.round((t.count / stats.totalPhotos) * 100) : 0
                    return (
                      <li key={t.id}>
                        <div className="mb-1 flex items-baseline justify-between text-[0.95rem]">
                          <span>
                            {t.name} <span className="text-sm text-muted">· {t.categoryName}</span>
                          </span>
                          <span className="text-sm text-ink-soft tabular-nums">{t.count}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-mist">
                          <motion.div
                            className="h-full bg-rose"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1.2, ease: SILK, delay: 0.3 }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="text-ink-soft">
                  Belum ada tag yang dipakai.{' '}
                  <Link to="/admin/tags" className="text-plum underline underline-offset-4">
                    Atur tag
                  </Link>
                </p>
              )}
              <div className="mt-8 flex items-center justify-between border-t border-line pt-5 text-sm lg:hidden">
                <span className="text-muted">Penyimpanan terpakai</span>
                <span>{stats ? formatBytes(stats.storageBytes) : '—'}</span>
              </div>
              <Link to="/admin/tags" className="btn-secondary mt-6 w-full">
                <TagIcon className="size-4" strokeWidth={1.5} /> Kelola tag
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub, delay }: { label: string; value?: number; sub?: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: SILK, delay }}>
      <dt className="sr-only">{label}</dt>
      <dd className="display text-[2.75rem] leading-none tabular-nums lining-nums lg:text-[3.75rem]">{value ?? '—'}</dd>
      <dd className="mt-1 text-sm text-ink-soft">
        <span className="font-semibold text-ink">{label}</span>
        {sub && <span className="block text-muted">{sub}</span>}
      </dd>
    </motion.div>
  )
}

function RecentTile({ photo, index }: { photo: AdminPhotoDTO; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: SILK, delay: index * 0.04 }}>
      <Link to={`/admin/photos/${photo.id}`} className="group block rounded-xs">
        <div className="relative overflow-hidden">
          <Img src={photo.thumbnailUrl} blur={photo.blurDataUrl} alt={photo.title} intrinsic={false} className="aspect-[3/4]" imgClassName="group-hover:scale-[1.04]" />
          {!photo.isActive && <span className="absolute top-1.5 left-1.5 rounded-xs bg-ink/75 px-1.5 py-0.5 text-[0.65rem] text-paper">Disembunyikan</span>}
        </div>
        <p className="mt-1.5 truncate text-sm">{photo.title}</p>
        <p className="text-xs text-muted">{relativeDay(photo.createdAt)}</p>
      </Link>
    </motion.div>
  )
}
