import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { AtSign, Menu, MessageCircle, Search, X } from 'lucide-react'
import { useSiteData, waLink } from '@/lib/site'
import { useLang } from '@/lib/i18n'
import { useLockBody } from '@/lib/hooks'
import { cx } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { useFocusTrap } from '@/components/ui/Sheet'

const SILK = [0.22, 1, 0.36, 1] as const

export function Wordmark({ name, className, light }: { name: string; className?: string; light?: boolean }) {
  const [first, ...rest] = name.split(' ')
  return (
    <span className={cx('font-display text-[1.6rem] leading-none tracking-[-0.01em]', light ? 'text-blush' : 'text-ink', className)}>
      {first}
      {rest.length > 0 && <span className={cx('italic', light ? 'text-gold-soft' : 'text-plum')}> {rest.join(' ')}</span>}
    </span>
  )
}

export { waLink }

function useNavItems() {
  const { t } = useLang()
  const { navChapters, hasAddons } = useSiteData()
  return [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/chapters', label: t('nav.chapters'), end: false },
    { to: '/catalog', label: t('nav.all'), end: true },
    ...navChapters.map((c) => ({ to: `/chapters/${c.slug}`, label: c.name, end: true })),
    ...(hasAddons ? [{ to: '/add-on', label: t('nav.addon'), end: true }] : []),
    { to: '/cara-sewa', label: t('nav.rent'), end: true },
    { to: '/fitting-online', label: t('nav.fitting'), end: true },
    { to: '/tentang-kami', label: t('nav.about'), end: true },
  ]
}

export function LangToggle({ light }: { light?: boolean }) {
  const { lang, setLang } = useLang()
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className={cx('inline-flex w-fit rounded-full border p-0.5 text-[0.7rem] font-semibold', light ? 'border-blush/30' : 'border-line-strong')}
    >
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cx(
            'min-h-7 min-w-8 rounded-full px-2 uppercase transition-colors duration-300',
            lang === l ? (light ? 'bg-blush text-noir' : 'bg-plum text-paper') : light ? 'text-blush/70' : 'text-ink-soft',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function PublicLayout() {
  const { settings, content } = useSiteData()
  const { t } = useLang()
  const nav = useNavItems()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  const bookHref = settings.whatsapp ? waLink(settings.whatsapp, t('wa.general', { brand: settings.brandName })) : '/catalog'
  const bookExternal = !!settings.whatsapp

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-paper focus:p-3">
        {t('skip')}
      </a>

      {/* Bar pengumuman */}
      {content.announcement && (
        <div className="band-noir relative z-40 px-4 py-2 text-center text-[0.8125rem] tracking-wide text-gold-soft">
          <Link to="/chapters" className="hover:text-blush">
            {content.announcement}
          </Link>
        </div>
      )}

      <header
        className={cx(
          'sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-500',
          scrolled ? 'border-line/80 bg-canvas/90 shadow-[0_8px_30px_-20px_rgb(43_15_34/0.4)] backdrop-blur-md' : 'border-transparent bg-canvas/60 backdrop-blur-sm',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:h-[4.5rem] md:px-8">
          <button
            type="button"
            className="icon-btn -ml-2 xl:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
          >
            <Menu className="size-6" strokeWidth={1.4} />
          </button>
          <Link to="/" aria-label={`${settings.brandName} — ${t('nav.home')}`} className="rounded-sm p-1 max-xl:mx-auto xl:-ml-1">
            <Wordmark name={settings.brandName} className="md:text-[1.85rem]" />
          </Link>

          <nav aria-label="Navigasi utama" className="mx-auto hidden items-center gap-0.5 xl:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'group relative rounded-sm px-2.5 py-2 text-[0.9rem] whitespace-nowrap transition-colors',
                    isActive ? 'text-plum' : 'text-ink-soft hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      className={cx(
                        'absolute inset-x-2.5 bottom-1 h-px origin-left bg-plum transition-transform duration-500 ease-(--ease-silk)',
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 xl:gap-2.5">
            <button type="button" className="icon-btn" onClick={() => setSearchOpen(true)} aria-label={t('nav.search')}>
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <div className="hidden sm:block">
              <LangToggle />
            </div>
            <a
              href={bookHref}
              {...(bookExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="btn-primary hidden min-h-10 px-4 text-[0.8125rem] tracking-[0.08em] uppercase md:inline-flex"
            >
              {t('cta.book')}
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      {pathname !== '/catalog' && <Footer nav={nav} />}

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} bookHref={bookHref} bookExternal={bookExternal} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function MobileMenu({
  open,
  onClose,
  nav,
  bookHref,
  bookExternal,
}: {
  open: boolean
  onClose: () => void
  nav: ReturnType<typeof useNavItems>
  bookHref: string
  bookExternal: boolean
}) {
  const { t } = useLang()
  const { settings } = useSiteData()
  const ref = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useFocusTrap(open, ref, onClose)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          tabIndex={-1}
          className="band-noir fixed inset-0 z-50 flex flex-col overflow-y-auto px-6 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)] outline-none"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <div className="flex h-12 items-center justify-between">
            <Wordmark name={settings.brandName} light />
            <button type="button" onClick={onClose} className="icon-btn text-blush hover:bg-blush/10 hover:text-paper" aria-label={t('nav.close')} data-autofocus>
              <X className="size-6" strokeWidth={1.4} />
            </button>
          </div>
          <div className="gold-rule mt-4" />
          <nav className="mt-6 flex flex-col" aria-label="Navigasi utama">
            {nav.map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: SILK, delay: 0.25 + i * 0.05 }}
              >
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-baseline gap-4 border-b border-blush/10 py-3 font-display text-[2rem] leading-tight',
                      isActive ? 'text-gold-soft italic' : 'text-blush',
                    )
                  }
                >
                  <span className="w-6 font-sans text-[0.7rem] tracking-widest text-blush/40">{String(i + 1).padStart(2, '0')}</span>
                  {item.label}
                </NavLink>
              </motion.div>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between gap-4 pt-8">
            <LangToggle light />
            <a
              href={bookHref}
              {...(bookExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="btn flex-1 bg-blush text-noir uppercase tracking-[0.08em] text-[0.85rem] hover:bg-paper"
            >
              {t('cta.book')}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useFocusTrap(open, ref, onClose)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : '/catalog')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-noir/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.search')}
            tabIndex={-1}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.55, ease: SILK }}
            className="band-blush relative px-5 pt-[max(env(safe-area-inset-top),20px)] pb-8 shadow-lift outline-none md:px-10 md:pb-12"
          >
            <form onSubmit={submit} className="mx-auto flex max-w-3xl items-center gap-3 border-b border-ink/40 pt-8">
              <Search className="size-6 shrink-0 text-ink-soft" strokeWidth={1.3} />
              <input
                type="search"
                data-autofocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('catalog.search')}
                className="min-h-16 w-full bg-transparent font-display text-[1.8rem] italic outline-none placeholder:text-ink-soft/50 md:text-[2.4rem]"
                enterKeyHint="search"
              />
              <button type="button" onClick={onClose} className="icon-btn" aria-label={t('nav.close')}>
                <X className="size-6" strokeWidth={1.4} />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Footer({ nav }: { nav: ReturnType<typeof useNavItems> }) {
  const { settings, site } = useSiteData()
  const { t } = useLang()
  const strip = site?.heroPhotos.slice(0, 6) ?? []
  const igHref = settings.instagram ? `https://instagram.com/${settings.instagram}` : null

  return (
    <footer className="band-noir mt-auto">
      <div className="mx-auto max-w-[1600px] px-5 pt-16 md:px-10 md:pt-20">
        <div className="text-center">
          <p className="script text-[3.2rem] text-gold-soft md:text-[4.5rem]">{settings.brandName}</p>
          <p className="mx-auto mt-2 max-w-md text-blush/70">{settings.tagline}</p>
        </div>
        <div className="gold-rule mt-10" />
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 py-5 text-[0.9rem]">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className="rounded-sm text-blush/80 transition-colors hover:text-gold-soft">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="gold-rule" />
      </div>

      {strip.length > 0 && (
        <div className="mt-10 grid grid-cols-3 gap-px md:grid-cols-6">
          {strip.map((p) => {
            const inner = (
              <>
                <Img src={p.thumbnailUrl} blur={p.blurDataUrl} alt="" intrinsic={false} className="aspect-square" imgClassName="transition-transform duration-[1200ms] group-hover:scale-105" />
                <span className="absolute inset-0 bg-noir/0 transition-colors duration-500 group-hover:bg-noir/30" />
              </>
            )
            return igHref ? (
              <a key={p.id} href={igHref} target="_blank" rel="noreferrer" className="group relative block" aria-label={t('footer.follow')}>
                {inner}
              </a>
            ) : (
              <Link key={p.id} to={`/catalog/${p.slug}`} className="group relative block" aria-label={p.title}>
                {inner}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-12 text-[0.9375rem] md:grid-cols-3 md:px-10">
        <div>
          <p className="ornament mb-3 text-[0.7rem] tracking-[0.2em] uppercase">{t('footer.studio')}</p>
          <p className="text-blush/80">{settings.city}</p>
          <p className="text-blush/60">{t('footer.byAppointment')}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <p className="ornament mb-1 text-[0.7rem] tracking-[0.2em] uppercase">{t('footer.contact')}</p>
          {settings.whatsapp && (
            <a className="inline-flex items-center gap-2 text-blush/80 hover:text-gold-soft" href={waLink(settings.whatsapp)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" strokeWidth={1.5} /> WhatsApp
            </a>
          )}
          {igHref && (
            <a className="inline-flex items-center gap-2 text-blush/80 hover:text-gold-soft" href={igHref} target="_blank" rel="noreferrer">
              <AtSign className="size-4" strokeWidth={1.5} /> {settings.instagram}
            </a>
          )}
          {!settings.whatsapp && !igHref && <p className="text-blush/50">—</p>}
        </div>
        <div className="md:text-right">
          <LangToggle light />
        </div>
      </div>
      <div className="border-t border-blush/10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 text-sm text-blush/50 md:px-10">
          <span>
            © {new Date().getFullYear()} {settings.brandName}
          </span>
          <Link to="/admin" className="rounded-sm hover:text-blush">
            {t('footer.manage')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
