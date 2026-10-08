import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCatalog, usePhoto } from '@/lib/queries'
import { useDocumentMeta } from '@/lib/hooks'
import { useLang } from '@/lib/i18n'
import { useSiteData } from '@/lib/site'
import { cx, formatPrice } from '@/lib/format'
import { Img } from '@/components/ui/Img'
import { Empty, Reveal } from '@/components/ui/Reveal'
import { ProductInfo } from '@/components/catalog/ProductInfo'
import { SectionTitle } from '@/components/site/Blocks'
import { ApiError } from '@/lib/api'
import type { GalleryImage, PhotoDTO } from '@shared/types'

const SILK = [0.22, 1, 0.36, 1] as const

/** Halaman mandiri untuk satu look — galeri, info sewa, booking, rekomendasi. */
export function LookPage() {
  const { slug = '' } = useParams()
  const { data: photo, isPending, error } = usePhoto(slug)
  const { settings } = useSiteData()
  const { t } = useLang()

  const related = useCatalog(
    {
      kind: photo?.kind === 'ADDON' ? 'addon' : 'gown',
      chapter: photo?.chapter?.slug,
      exclude: photo?.id,
    },
    { limit: 10, enabled: !!photo },
  )
  const relatedPhotos = related.data?.pages[0]?.items ?? []

  useDocumentMeta({
    title: photo ? `${photo.title} — ${settings.brandName}` : settings.brandName,
    description: photo
      ? (photo.description ?? `${photo.title}${photo.price ? ` · ${formatPrice(photo.price)}` : ''}${photo.tags.length ? ` · ${photo.tags.map((tag) => tag.name).join(', ')}` : ''}`)
      : undefined,
    image: photo?.imageUrl,
  })

  if (error) {
    return (
      <div className="py-16">
        <Empty
          title={(error as ApiError).status === 404 ? t('product.missing') : t('catalog.errorTitle')}
          body={t('product.missingBody')}
          action={
            <Link to="/catalog" className="btn-primary">
              {t('cta.seeAll')}
            </Link>
          }
        />
      </div>
    )
  }

  if (isPending || !photo) {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pt-10 md:grid-cols-2 md:px-10">
        <div className="skeleton aspect-[3/4]" />
        <div className="space-y-4">
          <div className="skeleton h-14 w-2/3" />
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    )
  }

  const images: GalleryImage[] = [
    { id: photo.id, imageUrl: photo.imageUrl, thumbnailUrl: photo.thumbnailUrl, blurDataUrl: photo.blurDataUrl, width: photo.width, height: photo.height },
    ...photo.images,
  ]
  const listPath = photo.kind === 'ADDON' ? '/add-on' : '/catalog'

  return (
    <article className="pt-6 md:pt-10">
      <nav aria-label="Breadcrumb" className="mx-auto mb-5 max-w-[1400px] px-5 text-sm text-muted md:px-10">
        <Link to="/" className="hover:text-plum">
          {t('nav.home')}
        </Link>{' '}
        /{' '}
        <Link to={listPath} className="hover:text-plum">
          {photo.kind === 'ADDON' ? t('nav.addon') : t('catalog.title')}
        </Link>
        {photo.chapter && (
          <>
            {' '}
            /{' '}
            <Link to={`/chapters/${photo.chapter.slug}`} className="hover:text-plum">
              {photo.chapter.name}
            </Link>
          </>
        )}
        {' '}/ <span className="text-ink-soft">{photo.title}</span>
      </nav>

      <div className="mx-auto grid max-w-[1400px] md:grid-cols-12 md:gap-10 md:px-10">
        <div className="md:col-span-7">
          <Gallery images={images} title={photo.title} />
        </div>
        <div className="px-5 pt-8 pb-16 md:col-span-5 md:px-0 md:pt-0">
          <div className="md:sticky md:top-28">
            <Reveal>
              <ProductInfo photo={photo} />
            </Reveal>
          </div>
        </div>
      </div>

      {relatedPhotos.length > 0 && <Related photos={relatedPhotos} title={t('product.related')} />}
    </article>
  )
}

function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const current = images[index]!
  const go = (d: number) => {
    const next = (index + d + images.length) % images.length
    setDir(d)
    setIndex(next)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (images.length < 2) return
    const swipe = info.offset.x + info.velocity.x * 0.2
    if (swipe < -70) go(1)
    else if (swipe > 70) go(-1)
  }

  return (
    <div className="md:grid md:grid-cols-[80px_1fr] md:gap-4">
      {/* Thumbnail (desktop) */}
      {images.length > 1 && (
        <div className="order-first hidden max-h-[80dvh] flex-col gap-3 overflow-y-auto md:flex">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setDir(i > index ? 1 : -1)
                setIndex(i)
              }}
              aria-label={`${title} ${i + 1}`}
              aria-current={i === index}
              className={cx('relative shrink-0 overflow-hidden rounded-xs transition-opacity', i === index ? 'ring-2 ring-plum ring-offset-2 ring-offset-canvas' : 'opacity-60 hover:opacity-100')}
            >
              <Img src={img.thumbnailUrl} blur={img.blurDataUrl} alt="" intrinsic={false} className="aspect-[3/4]" />
            </button>
          ))}
        </div>
      )}

      <div className={cx('relative overflow-hidden bg-mist', images.length < 2 && 'md:col-span-2')}>
        <motion.div
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 1.2, ease: SILK }}
          className="relative aspect-[3/4] max-h-[85dvh] w-full md:aspect-auto md:h-[min(85dvh,900px)]"
        >
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={current.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d > 0 ? 50 : d < 0 ? -50 : 0 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d > 0 ? -50 : 50 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: SILK }}
              drag={images.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={onDragEnd}
              className="absolute inset-0 touch-pan-y"
            >
              <Img src={current.imageUrl} blur={current.blurDataUrl} alt={title} intrinsic={false} eager={index === 0} className="size-full" imgClassName="object-cover md:object-contain" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="icon-btn absolute top-1/2 left-3 size-11 -translate-y-1/2 bg-paper/85 shadow-soft" aria-label="←">
              <ChevronLeft className="size-5" strokeWidth={1.4} />
            </button>
            <button type="button" onClick={() => go(1)} className="icon-btn absolute top-1/2 right-3 size-11 -translate-y-1/2 bg-paper/85 shadow-soft" aria-label="→">
              <ChevronRight className="size-5" strokeWidth={1.4} />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
              {images.map((img, i) => (
                <span key={img.id} className={cx('h-1.5 rounded-full transition-all duration-500', i === index ? 'w-5 bg-paper' : 'w-1.5 bg-paper/60')} />
              ))}
            </div>
            <p className="absolute top-3 right-3 rounded-full bg-noir/60 px-2.5 py-1 text-xs text-blush tabular-nums">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Related({ photos, title }: { photos: PhotoDTO[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="band-blush overflow-hidden py-16 md:py-24" aria-label={title}>
      <div className="mx-auto mb-8 flex max-w-[1400px] items-end justify-between px-5 md:px-10">
        <SectionTitle>{title}</SectionTitle>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} className="icon-btn border border-ink/20 hover:border-plum hover:bg-plum hover:text-paper" aria-label="←">
            <ChevronLeft className="size-5" strokeWidth={1.4} />
          </button>
          <button type="button" onClick={() => scroll(1)} className="icon-btn border border-ink/20 hover:border-plum hover:bg-plum hover:text-paper" aria-label="→">
            <ChevronRight className="size-5" strokeWidth={1.4} />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none mx-auto flex max-w-[1400px] snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 md:gap-6 md:scroll-px-10 md:px-10">
        {photos.map((p) => (
          <Link key={p.id} to={`/catalog/${p.slug}`} className="group block w-[56vw] max-w-[260px] shrink-0 snap-start rounded-xs sm:w-[34vw] lg:w-[18vw]">
            <div className="overflow-hidden">
              <Img src={p.thumbnailUrl} blur={p.blurDataUrl} alt={p.title} intrinsic={false} className="aspect-[3/4]" imgClassName="group-hover:scale-[1.04]" />
            </div>
            <p className="mt-2 font-display text-lg leading-tight italic group-hover:text-plum">{p.title}</p>
            {p.price != null && <p className="text-sm text-ink-soft lining-nums">{formatPrice(p.price)}</p>}
          </Link>
        ))}
      </div>
    </section>
  )
}
