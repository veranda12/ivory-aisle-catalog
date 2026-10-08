import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { ChevronLeft, ChevronRight, Link2, Share2, X } from 'lucide-react'
import { Link } from 'react-router'
import type { PhotoDTO } from '@shared/types'
import { cx } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import { ProductInfo, useShareLook } from './ProductInfo'
export { groupTags } from './ProductInfo'
import { useLockBody } from '@/lib/hooks'
import { useFocusTrap } from '@/components/ui/Sheet'

type Props = {
  photos: PhotoDTO[]
  index: number
  total: number
  onIndex: (i: number) => void
  onClose: () => void
  onNearEnd?: () => void
}

const SILK = [0.22, 1, 0.36, 1] as const

export function Lightbox({ photos, index, total, onIndex, onClose, onNearEnd }: Props) {
  const photo = photos[index]
  const [direction, setDirection] = useState(0)
  const [fullLoaded, setFullLoaded] = useState<Record<string, boolean>>({})
  const ref = useRef<HTMLDivElement>(null)
  const share = useShareLook()
  const { t } = useLang()
  useLockBody(true)
  useFocusTrap(true, ref, onClose)

  const go = useCallback(
    (delta: number) => {
      const next = index + delta
      if (next < 0 || next >= photos.length) return
      setDirection(delta)
      onIndex(next)
    },
    [index, photos.length, onIndex],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Muat lebih banyak sebelum sampai di ujung, dan pre-load foto tetangga.
  useEffect(() => {
    if (index >= photos.length - 3) onNearEnd?.()
    for (const n of [photos[index + 1], photos[index - 1]]) {
      if (n) new Image().src = n.imageUrl
    }
  }, [index, photos, onNearEnd])

  if (!photo) return null

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2
    if (swipe < -80) go(1)
    else if (swipe > 80) go(-1)
  }


  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail look: ${photo.title}`}
      tabIndex={-1}
      className="band-blush fixed inset-0 z-50 flex flex-col outline-none lg:flex-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.4 }}
    >
      {/* Bar atas */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 lg:right-[420px]">
        <p className="eyebrow pl-2 tabular-nums" aria-live="polite">
          {String(index + 1).padStart(2, '0')} <span className="text-line-strong">/</span> {String(total).padStart(2, '0')}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" className="icon-btn bg-canvas/70 backdrop-blur-sm" onClick={() => share(photo)} aria-label={t('cta.share')}>
            <Share2 className="size-5" strokeWidth={1.5} />
          </button>
          <button type="button" className="icon-btn bg-canvas/70 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Tutup" data-autofocus>
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Gambar */}
      <div className="relative flex min-h-0 flex-[1_1_64%] items-center justify-center overflow-hidden pt-14 lg:flex-1 lg:pt-0">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={photo.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d > 0 ? 60 : -60 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: SILK }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={onDragEnd}
            className="flex size-full touch-pan-y items-center justify-center px-3 pb-3 lg:px-16 lg:py-10"
          >
            <motion.div
              initial={direction === 0 ? { opacity: 0, scale: 0.94, y: 24 } : false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: SILK }}
              className="relative max-h-full overflow-hidden"
              style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : '3 / 4', height: '100%', maxWidth: '100%' }}
            >
              <img
                src={photo.thumbnailUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 size-full object-contain"
                draggable={false}
              />
              <img
                src={photo.imageUrl}
                alt={photo.title}
                draggable={false}
                onLoad={() => setFullLoaded((s) => ({ ...s, [photo.id]: true }))}
                className={cx(
                  'absolute inset-0 size-full object-contain transition-opacity duration-700',
                  fullLoaded[photo.id] ? 'opacity-100' : 'opacity-0',
                )}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Look sebelumnya"
          className="icon-btn absolute top-1/2 left-3 hidden size-12 -translate-y-1/2 bg-paper/80 disabled:opacity-0 md:inline-flex"
        >
          <ChevronLeft className="size-6" strokeWidth={1.25} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= photos.length - 1}
          aria-label="Look berikutnya"
          className="icon-btn absolute top-1/2 right-3 hidden size-12 -translate-y-1/2 bg-paper/80 disabled:opacity-0 md:inline-flex"
        >
          <ChevronRight className="size-6" strokeWidth={1.25} />
        </button>
      </div>

      {/* Info */}
      <motion.aside
        key={`info-${photo.id}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: SILK, delay: 0.1 }}
        className="relative flex max-h-[42dvh] min-h-0 flex-col border-t border-gold/30 bg-paper/80 lg:max-h-none lg:w-[440px] lg:border-t-0 lg:border-l"
      >
        <button type="button" className="icon-btn absolute top-5 right-5 z-10 hidden lg:inline-flex" onClick={onClose} aria-label={t('nav.close')}>
          <X className="size-6" strokeWidth={1.5} />
        </button>
        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(env(safe-area-inset-bottom),16px)] lg:px-9 lg:pt-20">
          <ProductInfo photo={photo} size="md" onNavigate={onClose} />
          {(
            <Link to={`/catalog/${photo.slug}`} onClick={onClose} className="mt-5 inline-flex items-center gap-2 rounded-sm text-sm text-plum underline-offset-4 hover:underline">
              <Link2 className="size-4" strokeWidth={1.75} /> {t('cta.lookPage')}
              {photo.images.length > 0 && ` · ${photo.images.length + 1} ${t('product.photos')}`}
            </Link>
          )}
          <p className="mt-4 hidden text-sm text-muted lg:block">{t('product.keys')}</p>
          <p className="mt-3 text-center text-xs text-muted lg:hidden">{t('product.swipe')}</p>
        </div>
      </motion.aside>
    </motion.div>,
    document.body,
  )
}
