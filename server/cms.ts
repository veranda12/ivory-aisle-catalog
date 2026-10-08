import type { Chapter, Showcase, Testimonial } from '@prisma/client'
import { prisma } from './db.js'
import type { ChapterDTO, ShowcaseDTO, TestimonialDTO } from '../shared/types.js'

export function toChapterDTO(c: Chapter, photoCount = 0): ChapterDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    numeral: c.numeral,
    description: c.description,
    coverUrl: c.coverUrl,
    coverThumb: c.coverThumb,
    coverBlur: c.coverBlur,
    coverIsFallback: false,
    sortOrder: c.sortOrder,
    showInNav: c.showInNav,
    isActive: c.isActive,
    photoCount,
  }
}

/** Chapter + jumlah produk aktif. Bila chapter tanpa sampul, pakai foto terbaru di dalamnya. */
export async function listChapters(opts: { onlyActive: boolean }): Promise<ChapterDTO[]> {
  const chapters = await prisma.chapter.findMany({
    where: opts.onlyActive ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { photos: opts.onlyActive ? { where: { isActive: true } } : true } },
      photos: {
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: { imageUrl: true, thumbnailUrl: true, blurDataUrl: true },
      },
    },
  })
  return chapters.map((c) => {
    const dto = toChapterDTO(c, c._count.photos)
    const fallback = c.photos[0]
    if (!dto.coverUrl && fallback) {
      dto.coverUrl = fallback.imageUrl
      dto.coverThumb = fallback.thumbnailUrl
      dto.coverBlur = fallback.blurDataUrl
      dto.coverIsFallback = true
    }
    return dto
  })
}

export const toTestimonialDTO = (t: Testimonial): TestimonialDTO => ({
  id: t.id,
  name: t.name,
  body: t.body,
  photoUrl: t.photoUrl,
  photoThumb: t.photoThumb,
  photoBlur: t.photoBlur,
  sortOrder: t.sortOrder,
  isActive: t.isActive,
})

type ShowcaseWithPhoto = Showcase & { photo: { id: string; slug: string; title: string; isActive: boolean } | null }

export const toShowcaseDTO = (s: ShowcaseWithPhoto, publicView = false): ShowcaseDTO => ({
  id: s.id,
  name: s.name,
  caption: s.caption,
  imageUrl: s.imageUrl,
  thumbnailUrl: s.thumbnailUrl,
  blurDataUrl: s.blurDataUrl,
  width: s.width,
  height: s.height,
  photo: s.photo && (!publicView || s.photo.isActive) ? { id: s.photo.id, slug: s.photo.slug, title: s.photo.title } : null,
  sortOrder: s.sortOrder,
  isActive: s.isActive,
})

export const showcaseInclude = { photo: { select: { id: true, slug: true, title: true, isActive: true } } } as const
