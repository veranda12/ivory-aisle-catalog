import { Navigate, NavLink, Outlet, useLocation, Link } from 'react-router'
import { motion } from 'motion/react'
import { Home, Images, Tags, Settings, Plus, ExternalLink, BookMarked, BookOpen, LayoutGrid } from 'lucide-react'
import { useMe, useSite } from '@/lib/queries'
import { useDocumentMeta } from '@/lib/hooks'
import { cx } from '@/lib/format'
import { Wordmark } from '@/components/PublicLayout'

// Sidebar desktop: semua menu.
const NAV = [
  { to: '/admin', label: 'Beranda', icon: Home, end: true },
  { to: '/admin/photos', label: 'Foto & produk', icon: Images, end: false },
  { to: '/admin/chapters', label: 'Chapter', icon: BookMarked, end: false },
  { to: '/admin/tags', label: 'Tag', icon: Tags, end: false },
  { to: '/admin/content', label: 'Konten', icon: BookOpen, end: false },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings, end: false },
]

// Navigasi bawah HP: 4 item + tombol tambah di tengah.
const MOBILE_NAV = [
  { to: '/admin', label: 'Beranda', icon: Home, end: true },
  { to: '/admin/photos', label: 'Foto', icon: Images, end: false },
  { to: '/admin/chapters', label: 'Chapter', icon: BookMarked, end: false },
  { to: '/admin/more', label: 'Lainnya', icon: LayoutGrid, end: false },
]

export default function AdminLayout() {
  const { data: me, isPending } = useMe()
  const { data: site } = useSite()
  const location = useLocation()
  useDocumentMeta({ title: `Admin · ${site?.settings.brandName ?? 'Katalog'}`, noindex: true })

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="display animate-pulse text-2xl text-muted italic">Memeriksa sesi…</span>
      </div>
    )
  }
  if (!me) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />

  const onUpload = location.pathname === '/admin/photos/new'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper/40 px-5 py-7 lg:flex">
        <Link to="/admin" className="rounded-sm px-2">
          <Wordmark name={site?.settings.brandName ?? 'Katalog'} />
          <p className="eyebrow mt-2">Studio admin</p>
        </Link>
        <Link to="/admin/photos/new" className="btn-primary mt-8 w-full">
          <Plus className="size-5" strokeWidth={1.75} /> Tambah foto
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu admin">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-11 items-center gap-3 rounded-sm px-3 text-[0.95rem] transition-colors',
                  isActive ? 'bg-blush/50 font-semibold text-plum' : 'text-ink-soft hover:bg-mist/50 hover:text-ink',
                )
              }
            >
              <Icon className="size-[18px]" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-line pt-5 text-sm">
          <a href="/" target="_blank" className="flex items-center gap-2 rounded-sm px-3 py-2 text-ink-soft hover:text-plum">
            <ExternalLink className="size-4" strokeWidth={1.5} /> Lihat katalog
          </a>
          <p className="truncate px-3 text-muted">{me.email}</p>
        </div>
      </aside>

      <main className="min-w-0 pb-32 lg:pb-12">
        <Outlet />
      </main>

      {/* Navigasi bawah (HP) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-safe backdrop-blur-md lg:hidden"
        aria-label="Menu admin"
      >
        <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 items-stretch">
          {MOBILE_NAV.slice(0, 2).map((item) => (
            <BottomItem key={item.to} {...item} />
          ))}
          <div className="relative flex justify-center">
            {!onUpload && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="absolute -top-6"
              >
                <Link
                  to="/admin/photos/new"
                  aria-label="Tambah foto"
                  className="flex size-16 items-center justify-center rounded-full bg-plum text-paper shadow-lift ring-4 ring-canvas transition-transform active:scale-95"
                >
                  <Plus className="size-7" strokeWidth={1.5} />
                </Link>
              </motion.div>
            )}
          </div>
          {MOBILE_NAV.slice(2).map((item) => (
            <BottomItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function BottomItem({ to, label, icon: Icon, end }: (typeof MOBILE_NAV)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors',
          isActive ? 'text-plum' : 'text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[22px]" strokeWidth={isActive ? 1.9 : 1.5} />
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Kepala halaman admin yang konsisten. */
export function AdminHeader({
  eyebrow,
  title,
  actions,
  back,
}: {
  eyebrow?: string
  title: React.ReactNode
  actions?: React.ReactNode
  back?: React.ReactNode
}) {
  return (
    <header className="px-4 pt-6 pb-5 sm:px-6 lg:px-10 lg:pt-10">
      {back}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="display truncate text-[2.4rem] leading-none lg:text-[3.25rem]">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
