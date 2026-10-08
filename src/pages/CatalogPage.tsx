import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useCatalog, useChapters, useFilters, usePhoto } from '@/lib/queries'
import { useDebounced, useDocumentMeta, useMediaQuery } from '@/lib/hooks'
import { useLang } from '@/lib/i18n'
import { useSiteData } from '@/lib/site'
import { cx } from '@/lib/format'
import { SORTS, useCatalogState } from '@/components/catalog/useCatalogState'
import { FilterPanel } from '@/components/catalog/FilterPanel'
import { GridSkeleton, MasonryGrid } from '@/components/catalog/MasonryGrid'
import { Lightbox } from '@/components/catalog/Lightbox'
import { Sheet } from '@/components/ui/Sheet'
import { Empty } from '@/components/ui/Reveal'
import type { PhotoDTO } from '@shared/types'

type Props = {
  kind?: 'gown' | 'addon'
  /** Bila diisi, katalog dikunci ke satu chapter (halaman /chapters/:slug). */
  fixedChapter?: string
  /** Kepala halaman khusus (judul chapter / add-on). */
  header?: ReactNode
  metaTitle?: string
  metaDescription?: string
}

export function CatalogPage({ kind = 'gown', fixedChapter, header, metaTitle, metaDescription }: Props = {}) {
  const state = useCatalogState()
  const { t, lang } = useLang()
  const { data: filters } = useFilters(kind)
  const { settings } = useSiteData()
  const showChapterChips = kind === 'gown' && !fixedChapter
  const { data: chapters } = useChapters()
  const chapter = fixedChapter ?? (showChapterChips ? state.chapter || undefined : undefined)
  const catalog = useCatalog({ ...state.apiParams, kind, chapter })
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const photos = useMemo(() => catalog.data?.pages.flatMap((p) => p.items) ?? [], [catalog.data])
  const total = catalog.data?.pages[0]?.total ?? 0
  const looks = (n: number) => `${n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')} ${t('home.looks')}`

  // Label tag aktif, mis. "ukuran.m" → { key, name: "M", category: "Ukuran" }
  const activeLabels = useMemo(() => {
    const map = new Map<string, { name: string; category: string }>()
    filters?.forEach((c) => c.tags.forEach((tag) => map.set(`${c.slug}.${tag.slug}`, { name: tag.name, category: c.name })))
    return state.active.map((key) => ({ key, ...(map.get(key) ?? { name: key.split('.')[1] ?? key, category: '' }) }))
  }, [filters, state.active])

  const activeChapterName = chapters?.find((c) => c.slug === state.chapter)?.name
  const heading = activeLabels.length
    ? activeLabels.slice(0, 3).map((l) => l.name).join(', ')
    : (activeChapterName ?? t('catalog.title'))

  useDocumentMeta({
    title: metaTitle ?? `${activeLabels.length ? `${heading} — ` : ''}${t('catalog.title')} · ${settings.brandName}`,
    description: metaDescription ?? `${settings.tagline}. ${t('catalog.title')}.`,
  })

  // ── Pencarian (debounce) ──
  const [query, setQuery] = useState(state.q)
  const debounced = useDebounced(query, 350)
  useEffect(() => {
    if (debounced !== state.q) state.setQ(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])
  useEffect(() => {
    setQuery(state.q)
  }, [state.q])

  // ── Infinite scroll ──
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && catalog.hasNextPage && !catalog.isFetchingNextPage) catalog.fetchNextPage()
      },
      { rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [catalog])

  // ── Lightbox ──
  const lookIndex = state.look ? photos.findIndex((p) => p.slug === state.look) : -1
  const deepLink = usePhoto(state.look && lookIndex === -1 ? state.look : '')
  const lightboxPhotos: PhotoDTO[] = lookIndex >= 0 ? photos : deepLink.data && state.look ? [deepLink.data] : []

  const openLook = useCallback((p: PhotoDTO) => state.openLook(p.slug), [state])
  const closeLook = useCallback(() => {
    if ((location.state as { lightbox?: boolean } | null)?.lightbox && window.history.length > 1) navigate(-1)
    else state.closeLook()
  }, [location.state, navigate, state])
  const loadMore = useCallback(() => {
    if (catalog.hasNextPage && !catalog.isFetchingNextPage) catalog.fetchNextPage()
  }, [catalog])

  const sortLabel = t(`sort.${(SORTS.find((s) => s.value === state.sort) ?? SORTS[0]).value}`)
  const hasFilters = state.active.length > 0 || !!state.q || (showChapterChips && !!state.chapter)
  const isInitial = catalog.isPending
  const refreshing = catalog.isPlaceholderData
  const clearAll = () => {
    state.clear()
    setQuery('')
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-8 pb-32 sm:px-5 md:px-10 md:pt-12 lg:pb-20">
      {/* Judul */}
      {header ?? (
        <header className="mb-6 md:mb-10">
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
            <Link to="/" className="hover:text-plum">
              {t('nav.home')}
            </Link>{' '}
            / <span className="text-ink-soft">{t('catalog.title')}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h1 className="script text-[3rem] text-plum md:text-[4.6rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={heading}
                  className="block"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {heading}
                </motion.span>
              </AnimatePresence>
            </h1>
            <p className="display pb-2 text-2xl text-plum italic md:text-3xl" aria-live="polite">
              {isInitial ? '…' : looks(total)}
            </p>
          </div>
        </header>
      )}

      {/* Chip chapter */}
      {showChapterChips && !!chapters?.length && (
        <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" className="chip shrink-0" aria-pressed={!state.chapter} onClick={() => state.setChapter('')}>
            {t('catalog.all')}
          </button>
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip shrink-0"
              aria-pressed={state.chapter === c.slug}
              onClick={() => state.setChapter(state.chapter === c.slug ? '' : c.slug)}
            >
              {c.numeral && <span className="font-display italic opacity-70">{c.numeral}.</span>} {c.name}
            </button>
          ))}
        </div>
      )}

      <div className={cx(filters?.length ? 'lg:grid lg:grid-cols-[250px_1fr] lg:gap-12 xl:grid-cols-[270px_1fr]' : '')}>
        {/* Sidebar filter (desktop) */}
        {desktop && !!filters?.length && (
          <aside className="sticky top-28 max-h-[calc(100dvh-8rem)] self-start overflow-y-auto pr-2 pb-10" aria-label={t('catalog.filter')}>
            <div className="mb-6 flex items-baseline justify-between border-b border-gold/40 pb-3">
              <p className="eyebrow">{t('catalog.refine')}</p>
              {state.active.length > 0 && (
                <button type="button" className="text-sm text-plum underline-offset-4 hover:underline" onClick={state.clearTags}>
                  {t('cta.clearAll')}
                </button>
              )}
            </div>
            <FilterPanel categories={filters} active={state.active} onToggle={state.toggle} compact collapsible />
          </aside>
        )}

        <section aria-label={t('catalog.title')}>
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-3">
            <label className="relative flex-1">
              <span className="sr-only">{t('nav.search')}</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" strokeWidth={1.5} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('catalog.search')}
                className="input border-transparent bg-paper/80 pl-10 shadow-[inset_0_-1px_0_var(--color-line)]"
                enterKeyHint="search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
                  aria-label={t('cta.clearAll')}
                >
                  <X className="size-4" />
                </button>
              )}
            </label>
            {desktop && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                {t('catalog.sort')}
                <select value={state.sort} onChange={(e) => state.setSort(e.target.value)} className="input w-auto min-w-40 cursor-pointer pr-8">
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {t(`sort.${s.value}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Filter aktif */}
          <AnimatePresence initial={false}>
            {(activeLabels.length > 0 || state.q) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="scrollbar-none -mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  <LayoutGroup>
                    <AnimatePresence initial={false} mode="popLayout">
                      {state.q && (
                        <motion.button
                          layout
                          key="__q"
                          type="button"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => setQuery('')}
                          className="chip shrink-0 border-plum/40 bg-blush/60 text-ink"
                        >
                          “{state.q}” <X className="size-3.5" />
                        </motion.button>
                      )}
                      {activeLabels.map((l) => (
                        <motion.button
                          layout
                          key={l.key}
                          type="button"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => state.remove(l.key)}
                          className="chip shrink-0 border-plum/40 bg-blush/60 text-ink"
                          aria-label={`${l.category} ${l.name} ×`}
                        >
                          {l.name} <X className="size-3.5" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </LayoutGroup>
                  <button type="button" onClick={clearAll} className="ml-1 shrink-0 rounded-sm px-2 py-2 text-sm whitespace-nowrap text-plum underline underline-offset-4">
                    {t('cta.clearAll')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid */}
          {catalog.isError && !photos.length ? (
            <Empty
              title={t('catalog.errorTitle')}
              body={t('catalog.errorBody')}
              action={
                <button type="button" className="btn-secondary" onClick={() => catalog.refetch()}>
                  {t('cta.retry')}
                </button>
              }
            />
          ) : isInitial ? (
            <GridSkeleton count={10} />
          ) : photos.length === 0 ? (
            hasFilters ? (
              <Empty
                title={t('catalog.emptyTitle')}
                body={t('catalog.emptyBody')}
                action={
                  <button type="button" className="btn-primary" onClick={clearAll}>
                    {t('cta.clearFilters')}
                  </button>
                }
              />
            ) : (
              <Empty title={t('catalog.soonTitle')} body={t('catalog.soonBody')} />
            )
          ) : (
            <div className={cx('transition-opacity duration-500', refreshing && 'opacity-50')}>
              <MasonryGrid photos={photos} onOpen={openLook} />
            </div>
          )}

          <div ref={sentinel} className="h-px" aria-hidden />
          {catalog.isFetchingNextPage && (
            <div className="mt-10">
              <GridSkeleton count={4} />
            </div>
          )}
          {!catalog.hasNextPage && photos.length > 12 && (
            <p className="mt-16 text-center font-display text-xl text-muted italic">{t('catalog.end')}</p>
          )}
        </section>
      </div>

      {/* Bar bawah (mobile) */}
      {!desktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
          <div className="pointer-events-auto flex overflow-hidden rounded-md bg-noir text-blush shadow-lift ring-1 ring-gold/30">
            {!!filters?.length && (
              <>
                <button type="button" onClick={() => setFilterOpen(true)} className="flex min-h-13 items-center gap-2.5 py-3 pr-5 pl-5 text-[0.95rem] font-semibold">
                  <SlidersHorizontal className="size-[18px]" strokeWidth={1.5} />
                  {t('catalog.filter')}
                  {state.active.length > 0 && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-noir">
                      {state.active.length}
                    </span>
                  )}
                </button>
                <span className="my-3 w-px bg-blush/20" aria-hidden />
              </>
            )}
            <button
              type="button"
              onClick={() => setSortOpen(true)}
              className="flex min-h-13 items-center gap-2.5 py-3 pr-5 pl-4 text-[0.95rem]"
              aria-label={`${t('catalog.sort')}: ${sortLabel}`}
            >
              <ArrowUpDown className="size-[18px]" strokeWidth={1.5} />
              {sortLabel}
            </button>
          </div>
        </div>
      )}

      <Sheet
        open={filterOpen && !desktop}
        onClose={() => setFilterOpen(false)}
        eyebrow={t('catalog.refine')}
        title={t('catalog.filter')}
        footer={
          <div className="flex items-center gap-3">
            <button type="button" className="btn-ghost" onClick={state.clearTags} disabled={!state.active.length}>
              {t('cta.clearAll')}
            </button>
            <button type="button" className="btn-primary flex-1" onClick={() => setFilterOpen(false)}>
              {catalog.isFetching && refreshing ? t('catalog.searching') : `${t('catalog.show')} ${looks(total)}`}
            </button>
          </div>
        }
      >
        {filters ? <FilterPanel categories={filters} active={state.active} onToggle={state.toggle} /> : <p className="py-10 text-center text-muted">…</p>}
      </Sheet>

      <Sheet open={sortOpen && !desktop} onClose={() => setSortOpen(false)} title={t('catalog.sort')} variant="bottom">
        <div className="flex flex-col pb-4" role="radiogroup" aria-label={t('catalog.sort')}>
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={state.sort === s.value}
              onClick={() => {
                state.setSort(s.value)
                setSortOpen(false)
              }}
              className={cx('flex min-h-14 items-center justify-between border-b border-line text-left', state.sort === s.value ? 'text-plum' : 'text-ink-soft')}
            >
              <span className={cx('font-display text-2xl', state.sort === s.value && 'italic')}>{t(`sort.${s.value}`)}</span>
              {state.sort === s.value && <span className="size-2 rounded-full bg-plum" />}
            </button>
          ))}
        </div>
      </Sheet>

      <AnimatePresence>
        {lightboxPhotos.length > 0 && (
          <Lightbox
            key="lightbox"
            photos={lightboxPhotos}
            index={lookIndex >= 0 ? lookIndex : 0}
            total={lookIndex >= 0 ? total : 1}
            onIndex={(i) => {
              const p = lightboxPhotos[i]
              if (p) state.switchLook(p.slug)
            }}
            onClose={closeLook}
            onNearEnd={lookIndex >= 0 ? loadMore : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
