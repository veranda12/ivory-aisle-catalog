import { Link, useParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, Clock, Sun, Sunset } from 'lucide-react'
import { useChapter, useChapters, useSite } from '@/lib/queries'
import { useDocumentMeta } from '@/lib/hooks'
import { useLang } from '@/lib/i18n'
import { useSiteData, waLink } from '@/lib/site'
import { cx } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Empty, Reveal } from '@/components/ui/Reveal'
import { NumberedList, OrderJourney, PeriodGuide, SectionTitle } from '@/components/site/Blocks'
import { CatalogPage } from './CatalogPage'

const SILK = [0.22, 1, 0.36, 1] as const

/** Kepala halaman bergaya pita wine dengan breadcrumb & judul huruf sambung. */
export function PageHero({
  crumb,
  title,
  kicker,
  intro,
  image,
}: {
  crumb: { label: string; to?: string }[]
  title: string
  kicker?: string
  intro?: string | null
  image?: { src: string; blur?: string | null } | null
}) {
  const { t } = useLang()
  return (
    <header className="band-noir relative overflow-hidden">
      {image && (
        <div className="absolute inset-0 opacity-30" aria-hidden>
          <Img src={image.src} blur={image.blur} alt="" intrinsic={false} className="size-full bg-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-noir via-noir/85 to-noir/40" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-4 top-4 bottom-4 border border-gold/20 md:inset-x-8" aria-hidden />
      <div className="relative mx-auto max-w-[1600px] px-8 pt-10 pb-12 md:px-16 md:pt-14 md:pb-16">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-blush/60">
          <Link to="/" className="hover:text-gold-soft">
            {t('nav.home')}
          </Link>
          {crumb.map((c) => (
            <span key={c.label}>
              {' / '}
              {c.to ? (
                <Link to={c.to} className="hover:text-gold-soft">
                  {c.label}
                </Link>
              ) : (
                <span className="text-blush/90">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {kicker && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="ornament mb-3 text-[0.7rem] font-semibold tracking-[0.24em] uppercase">
            {kicker}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: SILK }}
          className="script text-[3.4rem] text-gold-soft md:text-[5.2rem]"
        >
          {title}
        </motion.h1>
        {intro && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: SILK, delay: 0.2 }}
            className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-blush/80"
          >
            {intro}
          </motion.p>
        )}
      </div>
    </header>
  )
}

// ───────────────────────── /chapters ─────────────────────────

export function ChaptersPage() {
  const { t } = useLang()
  const { settings } = useSiteData()
  const { data: chapters, isPending } = useChapters()
  useDocumentMeta({ title: `${t('chapters.title')} · ${settings.brandName}`, description: t('chapters.intro') })

  return (
    <>
      <PageHero crumb={[{ label: t('chapters.title') }]} title={t('chapters.title')} intro={t('chapters.intro')} />
      <div className="mx-auto max-w-[1600px] px-5 py-14 md:px-10 md:py-20">
        {isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton aspect-[4/5]" />
            ))}
          </div>
        ) : !chapters?.length ? (
          <Empty title={t('catalog.soonTitle')} body={t('catalog.soonBody')} />
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 0.08} className={cx(i % 3 === 1 && 'lg:mt-16')}>
                <Link to={`/chapters/${c.slug}`} className="group block rounded-xs">
                  <div className="relative">
                    <div className="absolute -inset-2 border border-gold/40 transition-colors duration-700 group-hover:border-gold" aria-hidden />
                    <div className="relative overflow-hidden">
                      {c.coverUrl ? (
                        <Img src={c.coverThumb ?? c.coverUrl} blur={c.coverBlur} alt={c.name} intrinsic={false} className="aspect-[4/5]" imgClassName="transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                      ) : (
                        <div className="aspect-[4/5] bg-linear-to-br from-plum to-berry" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-noir/70 via-transparent to-transparent" />
                      <p className="absolute top-4 left-4 font-display text-[3.5rem] leading-none text-blush/90 italic">{c.numeral}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-gold uppercase">Chapter {c.numeral}</p>
                      <h2 className="display mt-1 text-[2.2rem] leading-none italic transition-colors group-hover:text-plum">{c.name}</h2>
                      {c.description && <p className="mt-2 line-clamp-2 text-ink-soft">{c.description}</p>}
                    </div>
                    <ArrowUpRight className="mt-6 size-6 shrink-0 text-muted transition-colors group-hover:text-plum" strokeWidth={1.2} />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ───────────────────────── /chapters/:slug ─────────────────────────

export function ChapterPage() {
  const { slug = '' } = useParams()
  const { t } = useLang()
  const { settings } = useSiteData()
  const { data: chapter, isError } = useChapter(slug)

  if (isError) {
    return (
      <div className="py-16">
        <Empty
          title={t('notfound.title')}
          body={t('notfound.body')}
          action={
            <Link to="/chapters" className="btn-primary">
              {t('chapters.title')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <>
      <PageHero
        crumb={[{ label: t('chapters.title'), to: '/chapters' }, { label: chapter?.name ?? '…' }]}
        kicker={chapter ? `Chapter ${chapter.numeral ?? ''} · ${chapter.photoCount} ${t('home.looks')}` : undefined}
        title={chapter?.name ?? ''}
        intro={chapter?.description}
        image={chapter?.coverUrl ? { src: chapter.coverUrl, blur: chapter.coverBlur } : null}
      />
      <CatalogPage
        key={slug}
        fixedChapter={slug}
        header={<div className="h-2" />}
        metaTitle={chapter ? `Chapter ${chapter.numeral ?? ''}: ${chapter.name} · ${settings.brandName}` : undefined}
        metaDescription={chapter?.description ?? undefined}
      />
    </>
  )
}

// ───────────────────────── /add-on ─────────────────────────

export function AddOnPage() {
  const { t } = useLang()
  const { settings } = useSiteData()
  return (
    <>
      <PageHero crumb={[{ label: t('addon.title') }]} title={t('addon.title')} intro={t('addon.intro')} />
      <CatalogPage kind="addon" header={<div className="h-2" />} metaTitle={`${t('addon.title')} · ${settings.brandName}`} metaDescription={t('addon.intro')} />
    </>
  )
}

// ───────────────────────── /cara-sewa ─────────────────────────

export function HowToRentPage() {
  const { t } = useLang()
  const { settings, content } = useSiteData()
  useDocumentMeta({ title: `${t('rent.title')} · ${settings.brandName}`, description: content.journey.map((j) => j.title).join(' · ') })

  return (
    <>
      <PageHero crumb={[{ label: t('rent.title') }]} title={t('rent.title')} intro={content.heroKicker} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <SectionTitle align="center" className="mb-12">
            {t('home.journey')}
          </SectionTitle>
          <OrderJourney steps={content.journey} />
        </div>
      </section>
      <section className="band-lavender py-16 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 px-5 md:px-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionTitle className="mb-8">{t('rent.period')}</SectionTitle>
            <PeriodGuide guide={content.periodGuide} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <SectionTitle className="mb-8">{t('rent.terms')}</SectionTitle>
            <NumberedList items={content.terms} />
          </div>
        </div>
      </section>
    </>
  )
}

// ───────────────────────── /fitting-online ─────────────────────────

const FITTING_ICONS = [Sun, Clock, Sunset]

export function FittingPage() {
  const { t } = useLang()
  const { settings, content } = useSiteData()
  const { data: site } = useSite()
  const photo = site?.heroPhotos[3] ?? site?.heroPhotos[0]
  useDocumentMeta({ title: `${t('fitting.title')} · ${settings.brandName}`, description: content.fittingIntro })

  return (
    <>
      <PageHero crumb={[{ label: t('fitting.title') }]} title={t('fitting.title')} intro={content.fittingIntro} />
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-[1400px] items-start gap-14 px-5 md:grid-cols-12 md:px-10">
          <div className="md:col-span-6">
            <SectionTitle className="mb-10">{t('fitting.schedule')}</SectionTitle>
            <ol className="space-y-8">
              {content.fittingSchedule.map((s, i) => {
                const Icon = FITTING_ICONS[i % FITTING_ICONS.length]!
                return (
                  <Reveal key={i} delay={i * 0.08}>
                    <li className="flex gap-5">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-paper text-plum">
                        <Icon className="size-6" strokeWidth={1.3} />
                      </span>
                      <div>
                        <p className="font-display text-[1.6rem] leading-tight">{s.title}</p>
                        <p className="mt-1 text-ink-soft">{s.body}</p>
                      </div>
                    </li>
                  </Reveal>
                )
              })}
            </ol>
            {settings.whatsapp && (
              <a href={waLink(settings.whatsapp, t('wa.fitting', { brand: settings.brandName }))} target="_blank" rel="noreferrer" className="btn-primary mt-10">
                {t('cta.bookFitting')}
              </a>
            )}
          </div>
          {photo && (
            <Reveal className="relative md:col-span-5 md:col-start-8" y={50}>
              <div className="absolute -inset-3 border border-gold/50" aria-hidden />
              <Img src={photo.imageUrl} blur={photo.blurDataUrl} alt="" intrinsic={false} className="aspect-[4/5]" />
            </Reveal>
          )}
        </div>
      </section>
      <section className="band-blush py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-5 md:px-10">
          <SectionTitle align="center" className="mb-10">
            {t('fitting.policy')}
          </SectionTitle>
          <NumberedList items={content.fittingPolicy} columns={2} />
        </div>
      </section>
    </>
  )
}

// ───────────────────────── /tentang-kami ─────────────────────────

export function AboutPage() {
  const { t } = useLang()
  const { settings, content, site } = useSiteData()
  const photos = site?.heroPhotos ?? []
  useDocumentMeta({ title: `${t('about.title')} · ${settings.brandName}`, description: content.aboutIntro })

  return (
    <>
      <PageHero crumb={[{ label: t('about.title') }]} title={t('about.title')} intro={content.aboutIntro} />
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 md:grid-cols-12 md:px-10">
          <div className="relative md:col-span-5">
            {photos[0] && (
              <Reveal className="relative w-[80%]">
                <div className="absolute -inset-3 border border-gold/50" aria-hidden />
                <Img src={photos[0].imageUrl} blur={photos[0].blurDataUrl} alt="" intrinsic={false} className="aspect-[3/4]" />
              </Reveal>
            )}
            {photos[1] && (
              <Reveal className="absolute right-0 -bottom-10 w-[46%] border-[6px] border-paper shadow-lift" delay={0.2} y={60}>
                <Img src={photos[1].thumbnailUrl} blur={photos[1].blurDataUrl} alt="" intrinsic={false} className="aspect-[3/4]" />
              </Reveal>
            )}
          </div>
          <Reveal className="md:col-span-6 md:col-start-7">
            <h2 className="display text-[2.6rem] leading-[1.02] md:text-[3.6rem]">{content.aboutTitle}</h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink-soft">{content.aboutBody}</p>
            <Link to="/catalog" className="btn-primary mt-8">
              {t('cta.explore')}
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="band-lavender py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <SectionTitle align="center" className="mb-12">
            {t('about.why')}
          </SectionTitle>
          <div className="grid gap-8 md:grid-cols-3">
            {content.why.map((w, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <p className="font-display text-[3.5rem] leading-none text-gold italic">{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-3 font-display text-[1.7rem] leading-tight">{w.title}</p>
                <p className="mx-auto mt-2 max-w-sm text-ink-soft">{w.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
