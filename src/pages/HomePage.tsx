import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useHome } from '@/lib/queries'
import { useDocumentMeta } from '@/lib/hooks'
import { useLang } from '@/lib/i18n'
import { useSiteData, waLink } from '@/lib/site'
import { cx, formatPrice } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { LineReveal, Reveal } from '@/components/ui/Reveal'
import { OrderJourney, SectionTitle } from '@/components/site/Blocks'
import type { ChapterDTO, PhotoDTO, ShowcaseDTO, TestimonialDTO } from '@shared/types'

const SILK = [0.22, 1, 0.36, 1] as const

export function HomePage() {
  const { site, settings, content } = useSiteData()
  const { data: home } = useHome()
  const { t } = useLang()
  useDocumentMeta({
    title: `${settings.brandName} — ${settings.tagline}`,
    description: settings.heroNote,
    image: site?.heroPhotos[0]?.imageUrl,
  })

  return (
    <>
      <Hero photos={site?.heroPhotos ?? []} total={site?.totalLooks} loading={!site} />
      {!!home?.chapters.length && <FeaturedChapters chapters={home.chapters} />}
      {!!home?.showcases.length && <WornBy items={home.showcases} title={content.wornByTitle} intro={content.wornByIntro} />}
      {!!home?.testimonials.length && <Testimonials items={home.testimonials} />}
      <section className="py-20 md:py-28" aria-label={t('home.journey')}>
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <SectionTitle align="center" className="mb-12 md:mb-16">
            {t('home.journey')}
          </SectionTitle>
          <OrderJourney steps={content.journey} />
          <div className="mt-12 text-center">
            <Link to="/cara-sewa" className="group inline-flex items-center gap-2 rounded-sm text-plum">
              {t('nav.rent')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
      <Closing />
    </>
  )
}

// ───────────────────────── Hero slider ─────────────────────────

function Hero({ photos, total, loading }: { photos: PhotoDTO[]; total?: number; loading: boolean }) {
  const { settings, content } = useSiteData()
  const { t } = useLang()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yImage = useTransform(scrollYProgress, [0, 1], ['0%', '12%'])
  const ySmall = useTransform(scrollYProgress, [0, 1], ['0%', '-25%'])
  const slides = photos.slice(0, 5)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const current = slides[index]
  const next = slides.length > 1 ? slides[(index + 1) % slides.length] : undefined

  const go = useCallback((d: number) => setIndex((i) => (slides.length ? (i + d + slides.length) % slides.length : 0)), [slides.length])

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = setTimeout(() => go(1), 6500)
    return () => clearTimeout(timer)
  }, [index, paused, slides.length, go])

  return (
    <section
      ref={ref}
      className="band-noir relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Sorotan koleksi"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* bingkai garis emas */}
      <div className="pointer-events-none absolute inset-x-4 top-4 bottom-4 border border-gold/20 md:inset-x-8 md:top-8 md:bottom-8" aria-hidden />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full border border-gold/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative mx-auto grid max-w-[1600px] gap-12 px-8 pt-12 pb-20 md:grid-cols-12 md:px-16 md:pt-20 md:pb-24 lg:min-h-[min(88dvh,860px)] lg:items-center">
        {/* Teks */}
        <div className="relative z-10 md:col-span-6 lg:col-span-5">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="ornament mb-6 text-[0.7rem] font-semibold tracking-[0.24em] uppercase"
          >
            {total ? `${total} ${t('home.looks')} · ${settings.city}` : settings.city}
          </motion.p>
          <h1 className="font-display text-[2.75rem] leading-[0.95] font-light text-blush min-[375px]:text-[3.05rem] min-[414px]:text-[3.3rem] md:text-[4.6rem] lg:text-[5.6rem]">
            <LineReveal delay={0.4} lines={[settings.heroLine1, <em key="2" className="font-normal text-gold-soft">{settings.heroLine2}</em>]} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: SILK, delay: 1 }}
            className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-blush/75"
          >
            {content.heroKicker || settings.heroNote}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: SILK, delay: 1.2 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to="/catalog" className="btn bg-blush text-noir hover:bg-paper">
              {t('cta.explore')} <ArrowRight className="size-4" strokeWidth={1.6} />
            </Link>
            <Link to="/chapters" className="btn border border-blush/40 text-blush hover:border-gold hover:text-gold-soft">
              {t('nav.chapters')}
            </Link>
          </motion.div>

          {slides.length > 1 && (
            <div className="mt-12 flex items-center gap-4">
              <button type="button" onClick={() => go(-1)} className="icon-btn border border-blush/25 text-blush hover:bg-blush/10 hover:text-paper" aria-label="Sebelumnya">
                <ChevronLeft className="size-5" strokeWidth={1.4} />
              </button>
              <div className="flex gap-2" role="tablist" aria-label="Pilih slide">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={s.title}
                    onClick={() => setIndex(i)}
                    className="relative flex h-6 w-8 items-center md:w-12"
                  >
                    <span className="h-0.5 w-full bg-blush/25" />
                    {i === index && (
                      <motion.span
                        key={`${index}-${paused}`}
                        className="absolute left-0 h-0.5 bg-gold-soft"
                        initial={{ width: paused ? '100%' : '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: paused ? 0 : 6.5, ease: 'linear' }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => go(1)} className="icon-btn border border-blush/25 text-blush hover:bg-blush/10 hover:text-paper" aria-label="Berikutnya">
                <ChevronRight className="size-5" strokeWidth={1.4} />
              </button>
            </div>
          )}
        </div>

        {/* Kolase foto */}
        <div className="relative md:col-span-6 lg:col-span-6 lg:col-start-7">
          <motion.div style={{ y: yImage }} className="relative ml-auto w-[86%] md:w-[82%]">
            <div className="absolute -inset-3 border border-gold/50 md:-inset-4" aria-hidden />
            <div className="absolute -inset-1.5 border border-gold/25 md:-inset-2" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden bg-noir-soft">
              <AnimatePresence initial={false}>
                {current ? (
                  <motion.div
                    key={current.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 1.2 }, scale: { duration: 7, ease: 'linear' } }}
                  >
                    <Img src={current.imageUrl} blur={current.blurDataUrl} alt={current.title} eager={index === 0} intrinsic={false} className="size-full bg-noir-soft" />
                  </motion.div>
                ) : (
                  <div className={cx('absolute inset-0 bg-linear-to-br from-plum via-berry/60 to-noir', loading && 'animate-pulse')} />
                )}
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-noir/75 to-transparent" />
              {current && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5"
                  >
                    <div className="min-w-0">
                      {current.chapter && (
                        <p className="truncate text-[0.65rem] tracking-[0.2em] text-gold-soft uppercase">
                          Chapter {current.chapter.numeral ?? ''} · {current.chapter.name}
                        </p>
                      )}
                      <p className="script truncate text-[2rem] text-blush">{current.title}</p>
                    </div>
                    <Link
                      to={`/catalog/${current.slug}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush/90 text-noir transition-colors hover:bg-paper"
                      aria-label={current.title}
                    >
                      <ArrowUpRight className="size-5" strokeWidth={1.5} />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {next && (
            <motion.div
              style={{ y: ySmall }}
              className="absolute top-[10%] left-0 hidden w-[30%] border-[5px] border-paper/90 shadow-lift min-[420px]:block"
              aria-hidden
            >
              <AnimatePresence mode="wait">
                <motion.div key={next.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
                  <Img src={next.thumbnailUrl} blur={next.blurDataUrl} alt="" intrinsic={false} className="aspect-[3/4]" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── Carousel helper ─────────────────────────

function useCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  return { ref, scroll }
}

function CarouselArrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const cls = 'border-ink/20 text-ink hover:bg-plum hover:text-paper hover:border-plum'
  return (
    <div className="hidden shrink-0 gap-2 sm:flex">
      <button type="button" onClick={onPrev} className={cx('icon-btn border', cls)} aria-label="Geser ke kiri">
        <ChevronLeft className="size-5" strokeWidth={1.4} />
      </button>
      <button type="button" onClick={onNext} className={cx('icon-btn border', cls)} aria-label="Geser ke kanan">
        <ChevronRight className="size-5" strokeWidth={1.4} />
      </button>
    </div>
  )
}

// ───────────────────────── Featured chapters ─────────────────────────

function FeaturedChapters({ chapters }: { chapters: ChapterDTO[] }) {
  const { t } = useLang()
  const { ref, scroll } = useCarousel()
  return (
    <section className="band-blush overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28" aria-label={t('home.featured')}>
      <div className="mx-auto mb-10 flex max-w-[1600px] items-end justify-between gap-6 px-5 md:px-10">
        <SectionTitle sub={t('home.featuredSub')}>{t('home.featured')}</SectionTitle>
        <CarouselArrows onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
      </div>
      <div ref={ref} className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:gap-6 md:scroll-px-10 md:px-10">
        {chapters.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.06} className="w-[72vw] max-w-[380px] shrink-0 snap-start sm:w-[44vw] lg:w-[24vw]">
            <Link to={`/chapters/${c.slug}`} className="group block rounded-xs">
              <div className="relative overflow-hidden">
                {c.coverUrl ? (
                  <Img src={c.coverThumb ?? c.coverUrl} blur={c.coverBlur} alt={c.name} intrinsic={false} className="aspect-[3/4]" imgClassName="transition-transform duration-[1400ms] group-hover:scale-[1.06]" />
                ) : (
                  <div className="aspect-[3/4] bg-linear-to-br from-plum to-berry" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-noir/80 via-noir/10 to-transparent" />
                <div className="absolute inset-3 border border-gold/0 transition-colors duration-700 group-hover:border-gold/60" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[0.65rem] tracking-[0.22em] text-gold-soft uppercase">Chapter {c.numeral}</p>
                  <p className="mt-1 font-display text-[2rem] leading-none text-blush italic">{c.name}</p>
                  <p className="mt-2 text-sm text-blush/70">
                    {c.photoCount} {t('home.looks')}
                  </p>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
        <span className="w-1 shrink-0" aria-hidden />
      </div>
    </section>
  )
}

// ───────────────────────── Worn by ─────────────────────────

function WornBy({ items, title, intro }: { items: ShowcaseDTO[]; title: string; intro: string }) {
  const { t } = useLang()
  return (
    <section className="py-20 md:py-28" aria-label={title}>
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-4">
          <div className="md:sticky md:top-32">
            <SectionTitle sub={intro}>{title}</SectionTitle>
            <Link to="/catalog" className="btn-primary mt-8">
              {t('cta.explore')}
            </Link>
          </div>
        </div>
        <div className="space-y-14 md:col-span-7 md:col-start-6 md:space-y-20">
          {items.map((s, i) => (
            <Reveal key={s.id} y={40} className={cx('w-full', i % 2 === 1 ? 'md:ml-auto md:w-[72%]' : 'md:w-[80%]')}>
              <figure className="group relative">
                <div className="absolute -inset-2 border border-gold/40" aria-hidden />
                <div className="relative overflow-hidden">
                  <Img src={s.imageUrl} blur={s.blurDataUrl} alt={s.name} intrinsic={false} className="aspect-[4/5]" imgClassName="transition-transform duration-[1600ms] group-hover:scale-[1.03]" />
                  <figcaption className="absolute inset-x-0 top-0 bg-linear-to-b from-noir/55 to-transparent p-4 md:p-5">
                    <span className="script text-[2.2rem] text-blush drop-shadow md:text-[2.6rem]">{s.name}</span>
                    {s.caption && <span className="block text-sm text-blush/80">{s.caption}</span>}
                  </figcaption>
                </div>
                {s.photo && (
                  <Link to={`/catalog/${s.photo.slug}`} className="mt-4 inline-flex items-center gap-2 rounded-sm text-ink-soft hover:text-plum">
                    <span className="text-sm">{s.photo.title}</span>
                    <ArrowUpRight className="size-4" strokeWidth={1.5} />
                  </Link>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── Testimonials ─────────────────────────

function Testimonials({ items }: { items: TestimonialDTO[] }) {
  const { t } = useLang()
  const { ref, scroll } = useCarousel()
  return (
    <section className="band-lavender overflow-hidden py-20 md:py-28" aria-label={t('home.testimonials')}>
      <div className="mx-auto mb-10 flex max-w-[1600px] items-end justify-between px-5 md:px-10">
        <SectionTitle>{t('home.testimonials')}</SectionTitle>
        <CarouselArrows onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
      </div>
      <div ref={ref} className="scrollbar-none flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:gap-6 md:scroll-px-10 md:px-10">
        {items.map((it, i) => (
          <Reveal key={it.id} delay={i * 0.06} className="flex w-[80vw] max-w-[380px] shrink-0 snap-start sm:w-[46vw] lg:w-[30vw]">
            <article className="flex w-full flex-col rounded-md bg-paper p-5 shadow-soft">
              {it.photoThumb ? (
                <Img src={it.photoThumb} blur={it.photoBlur} alt="" intrinsic={false} className="mb-5 aspect-[4/3] rounded-xs" />
              ) : (
                <Quote className="mb-4 size-8 text-rose" strokeWidth={1} />
              )}
              <p className="flex-1 leading-relaxed text-ink-soft">{it.body}</p>
              <p className="script mt-5 text-[2rem] text-plum">{it.name}</p>
            </article>
          </Reveal>
        ))}
        <span className="w-1 shrink-0" aria-hidden />
      </div>
    </section>
  )
}

// ───────────────────────── Closing ─────────────────────────

function Closing() {
  const { settings, site } = useSiteData()
  const { t } = useLang()
  const photo = site?.heroPhotos[2]
  return (
    <section className="band-blush relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 md:grid-cols-12 md:px-10">
        <Reveal className="md:col-span-7">
          <p className="display text-[2.5rem] leading-[1.02] md:text-[4rem]">
            {t('home.closing')} <em className="text-plum">{t('home.closingSub')}</em>
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {settings.whatsapp && (
              <a href={waLink(settings.whatsapp, t('wa.general', { brand: settings.brandName }))} target="_blank" rel="noreferrer" className="btn-primary">
                {t('cta.whatsapp')}
              </a>
            )}
            <Link to="/catalog" className={settings.whatsapp ? 'btn-secondary' : 'btn-primary'}>
              {t('cta.seeAll')}
            </Link>
          </div>
        </Reveal>
        {photo && (
          <Reveal className="hidden md:col-span-4 md:col-start-9 md:block" y={50}>
            <Link to={`/catalog/${photo.slug}`} className="group relative block">
              <div className="absolute -inset-3 rotate-2 border border-gold/50" aria-hidden />
              <Img src={photo.thumbnailUrl} blur={photo.blurDataUrl} alt={photo.title} intrinsic={false} className="aspect-[3/4] -rotate-1" />
              <p className="mt-4 text-center text-sm text-ink-soft">
                {photo.title}
                {photo.price ? ` · ${formatPrice(photo.price)}` : ''}
              </p>
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  )
}
