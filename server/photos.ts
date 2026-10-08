import type { Prisma } from '@prisma/client'
import { prisma } from './db.js'
import type { AdminPhotoDTO, PhotoDTO, TagDTO } from '../shared/types.js'
import { randomSuffix, slugify } from './text.js'

export const photoInclude = {
  tags: {
    include: { tag: { include: { category: true } } },
  },
  chapter: { select: { id: true, name: true, slug: true, numeral: true } },
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.PhotoInclude

type PhotoWithTags = Prisma.PhotoGetPayload<{ include: typeof photoInclude }>

export function toPhotoDTO(p: PhotoWithTags, opts: { onlyActiveTags?: boolean } = {}): PhotoDTO {
  const tags: TagDTO[] = p.tags
    .filter((pt) => !opts.onlyActiveTags || pt.tag.isActive)
    .sort(
      (a, b) =>
        a.tag.category.sortOrder - b.tag.category.sortOrder ||
        a.tag.sortOrder - b.tag.sortOrder ||
        a.tag.name.localeCompare(b.tag.name),
    )
    .map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
      categoryId: pt.tag.categoryId,
      categorySlug: pt.tag.category.slug,
      categoryName: pt.tag.category.name,
    }))

  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    slug: p.slug,
    description: p.description,
    chapter: p.chapter,
    price: p.price,
    deposit: p.deposit,
    bust: p.bust,
    waist: p.waist,
    length: p.length,
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbnailUrl,
    blurDataUrl: p.blurDataUrl,
    width: p.width,
    height: p.height,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    tags,
    images: p.images.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      thumbnailUrl: i.thumbnailUrl,
      blurDataUrl: i.blurDataUrl,
      width: i.width,
      height: i.height,
    })),
  }
}

export const toAdminPhotoDTO = (p: PhotoWithTags): AdminPhotoDTO => ({ ...toPhotoDTO(p), sizeBytes: p.sizeBytes })

/**
 * Filter multi-tag:
 *  - tag dalam KATEGORI YANG SAMA digabung dengan OR  (Size M atau L)
 *  - antar KATEGORI digabung dengan AND               (Gown dan Size M dan Hijab Friendly)
 * Setiap grup menjadi satu EXISTS-subquery ke photo_tags (diindeks oleh [tag_id, photo_id]).
 */
export function tagGroupsWhere(groups: string[][]): Prisma.PhotoWhereInput[] {
  return groups.filter((g) => g.length).map((ids) => ({ tags: { some: { tagId: { in: ids } } } }))
}

export function searchWhere(q: string | undefined): Prisma.PhotoWhereInput | undefined {
  const term = q?.trim()
  if (!term) return undefined
  const words = term.split(/\s+/).slice(0, 5)
  // Setiap kata harus cocok dengan salah satu: judul, chapter, deskripsi, atau nama tag.
  return {
    AND: words.map((w) => ({
      OR: [
        { title: { contains: w, mode: 'insensitive' } },
        { chapter: { name: { contains: w, mode: 'insensitive' } } },
        { description: { contains: w, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: w, mode: 'insensitive' } } } } },
      ],
    })),
  }
}

export async function uniquePhotoSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'look'
  let slug = base
  for (let i = 0; i < 6; i++) {
    const exists = await prisma.photo.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
    if (!exists) return slug
    slug = `${base}-${randomSuffix(4)}`
  }
  return `${base}-${Date.now().toString(36)}`
}
