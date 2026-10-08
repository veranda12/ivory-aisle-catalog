import { memo, useMemo } from 'react'
import { motion } from 'motion/react'
import type { PhotoDTO } from '@shared/types'
import { Img } from '@/components/ui/Img'
import { formatPrice, cx } from '@/lib/format'
import { useColumnCount } from '@/lib/hooks'

type Props = {
  photos: PhotoDTO[]
  onOpen: (photo: PhotoDTO, index: number) => void
}

/**
 * Masonry editorial: tiap foto ditaruh di kolom yang paling pendek
 * (tinggi dihitung dari rasio asli foto), jadi urutan tetap natural dan
 * tidak ada lompatan saat halaman berikutnya dimuat.
 */
export function MasonryGrid({ photos, onOpen }: Props) {
  const cols = useColumnCount()

  const columns = useMemo(() => {
    const out: { photo: PhotoDTO; index: number }[][] = Array.from({ length: cols }, () => [])
    const heights = new Array(cols).fill(0)
    // Kolom genap diberi "start offset" agar komposisi terasa asimetris.
    for (let c = 0; c < cols; c++) heights[c] = c % 2 === 1 ? 0.18 : 0
    photos.forEach((photo, index) => {
      const ratio = photo.width && photo.height ? photo.height / photo.width : 1.33
      let target = 0
      for (let c = 1; c < cols; c++) if (heights[c] < heights[target] - 0.01) target = c
      out[target]!.push({ photo, index })
      heights[target] += ratio + 0.32 // + ruang caption
    })
    return out
  }, [photos, cols])

  return (
    <div className="flex items-start gap-3 sm:gap-5 lg:gap-7">
      {columns.map((col, c) => (
        <div key={c} className={cx('flex min-w-0 flex-1 flex-col gap-7 md:gap-10', c % 2 === 1 && 'mt-10 md:mt-16')}>
          {col.map(({ photo, index }) => (
            <PhotoCard key={photo.id} photo={photo} index={index} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </div>
  )
}

const PhotoCard = memo(function PhotoCard({
  photo,
  index,
  onOpen,
}: {
  photo: PhotoDTO
  index: number
  onOpen: Props['onOpen']
}) {
  const subtitle = photo.chapter?.name ?? photo.tags.find((t) => t.categorySlug === 'model')?.name
  return (
    <motion.article
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.07 }}
    >
      <a
        href={`/catalog/${photo.slug}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          onOpen(photo, index)
        }}
        className="group block rounded-xs"
        aria-label={`${photo.title}${photo.price ? `, ${formatPrice(photo.price)}` : ''}`}
      >
        <div className="overflow-hidden">
          <Img
            src={photo.thumbnailUrl}
            blur={photo.blurDataUrl}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
            imgClassName="group-hover:scale-[1.035] motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="mt-2.5 flex items-start justify-between gap-2 md:mt-3">
          <div className="min-w-0">
            <h3 className="display truncate text-[1.15rem] leading-tight italic transition-colors duration-300 group-hover:text-plum md:text-[1.35rem]">
              {photo.title}
            </h3>
            {subtitle && <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p>}
          </div>
          {photo.price != null && (
            <p className="shrink-0 pt-0.5 text-[0.8125rem] whitespace-nowrap text-ink-soft md:text-sm">
              {formatPrice(photo.price)}
            </p>
          )}
        </div>
      </a>
    </motion.article>
  )
})

export function GridSkeleton({ count = 8 }: { count?: number }) {
  const cols = useColumnCount()
  const ratios = [1.4, 1.25, 1.5, 1.3, 1.45, 1.2]
  return (
    <div className="flex items-start gap-3 sm:gap-5 lg:gap-7" aria-hidden>
      {Array.from({ length: cols }, (_, c) => (
        <div key={c} className={cx('flex flex-1 flex-col gap-7 md:gap-10', c % 2 === 1 && 'mt-10 md:mt-16')}>
          {Array.from({ length: Math.ceil(count / cols) }, (_, i) => (
            <div key={i}>
              <div className="skeleton w-full" style={{ aspectRatio: `1 / ${ratios[(c + i * 2) % ratios.length]}` }} />
              <div className="skeleton mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
