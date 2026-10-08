import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http.js'
import { photoInclude, searchWhere, tagGroupsWhere, toPhotoDTO } from '../photos.js'
import { getContent, getSettings } from '../settings.js'
import { listChapters, showcaseInclude, toShowcaseDTO, toTestimonialDTO } from '../cms.js'
import { siteUrl } from '../env.js'
import type { FilterCategory, HomeData, PhotoPage, SiteInfo } from '../../shared/types.js'

export const publicRouter = Router()

// Cache singkat di CDN Vercel: katalog terasa instan, perubahan admin terlihat dalam ±1 menit.
const cache = (seconds: number) => `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 10}`

publicRouter.get('/site', async (_req, res) => {
  const [settings, content, totalLooks, hero, navChapters, addonCount] = await Promise.all([
    getSettings(),
    getContent(),
    prisma.photo.count({ where: { isActive: true, kind: 'GOWN' } }),
    // Hero: foto yang ditandai "unggulan" dulu, lalu yang terbaru.
    prisma.photo.findMany({
      where: { isActive: true, kind: 'GOWN' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: photoInclude,
    }),
    prisma.chapter.findMany({
      where: { isActive: true, showInNav: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, numeral: true },
    }),
    prisma.photo.count({ where: { isActive: true, kind: 'ADDON' } }),
  ])
  const body: SiteInfo = {
    settings,
    content,
    totalLooks,
    heroPhotos: hero.map((p) => toPhotoDTO(p, { onlyActiveTags: true })),
    navChapters,
    hasAddons: addonCount > 0,
  }
  res.set('Cache-Control', cache(60)).json(body)
})

publicRouter.get('/home', async (_req, res) => {
  const [chapters, showcases, testimonials] = await Promise.all([
    listChapters({ onlyActive: true }),
    prisma.showcase.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: showcaseInclude,
    }),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
  ])
  const body: HomeData = {
    chapters: chapters.filter((c) => c.photoCount > 0),
    showcases: showcases.map((s) => toShowcaseDTO(s, true)),
    testimonials: testimonials.map(toTestimonialDTO),
  }
  res.set('Cache-Control', cache(60)).json(body)
})

publicRouter.get('/chapters', async (_req, res) => {
  const chapters = await listChapters({ onlyActive: true })
  res.set('Cache-Control', cache(60)).json(chapters.filter((c) => c.photoCount > 0))
})

publicRouter.get('/chapters/:slug', async (req, res) => {
  const slug = z.string().max(120).parse(req.params.slug)
  const chapter = (await listChapters({ onlyActive: true })).find((c) => c.slug === slug)
  if (!chapter) throw new HttpError(404, 'Chapter tidak ditemukan.')
  res.set('Cache-Control', cache(60)).json(chapter)
})

const kindParam = z
  .enum(['gown', 'addon'])
  .optional()
  .transform((k) => (k === 'addon' ? ('ADDON' as const) : k === 'gown' ? ('GOWN' as const) : undefined))

publicRouter.get('/catalog/filters', async (req, res) => {
  const kind = kindParam.parse(req.query.kind) ?? 'GOWN'
  const [categories, counts] = await Promise.all([
    prisma.tagCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { tags: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    }),
    prisma.photoTag.groupBy({ by: ['tagId'], where: { photo: { isActive: true, kind } }, _count: { _all: true } }),
  ])
  const countMap = new Map(counts.map((c) => [c.tagId, c._count._all]))
  const body: FilterCategory[] = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tags: c.tags
        .map((t) => ({ id: t.id, name: t.name, slug: t.slug, count: countMap.get(t.id) ?? 0 }))
        .filter((t) => t.count > 0),
    }))
    .filter((c) => c.tags.length > 0)
  res.set('Cache-Control', cache(60)).json(body)
})

const listQuery = z.object({
  q: z.string().max(100).optional(),
  // format: "kategori.tag,kategori.tag" — contoh: model.gown,size.m
  tags: z.string().max(1000).optional(),
  chapter: z.string().max(120).optional(),
  kind: kindParam,
  exclude: z.string().max(40).optional(),
  sort: z.enum(['newest', 'oldest', 'az', 'price-asc', 'price-desc']).default('newest'),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(24),
})

publicRouter.get('/catalog/photos', async (req, res) => {
  const { q, tags, chapter, kind, exclude, sort, offset, limit } = listQuery.parse(req.query)

  const pairs = (tags ?? '')
    .split(',')
    .map((s) => s.trim().split('.'))
    .filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1])
    .slice(0, 30)

  let groups: string[][] = []
  if (pairs.length) {
    const found = await prisma.tag.findMany({
      where: {
        isActive: true,
        OR: pairs.map(([cat, slug]) => ({ slug, category: { slug: cat } })),
      },
      select: { id: true, categoryId: true },
    })
    // Jika ada tag yang tidak dikenal, hasilnya harus kosong (bukan diabaikan diam-diam).
    if (found.length < new Set(pairs.map((p) => p.join('.'))).size) {
      const empty: PhotoPage = { items: [], total: 0, nextOffset: null }
      res.json(empty)
      return
    }
    const byCat = new Map<string, string[]>()
    for (const t of found) byCat.set(t.categoryId, [...(byCat.get(t.categoryId) ?? []), t.id])
    groups = [...byCat.values()]
  }

  const search = searchWhere(q)
  const and: Prisma.PhotoWhereInput[] = [...tagGroupsWhere(groups)]
  if (search) and.push(search)
  if (chapter) and.push({ chapter: { slug: chapter, isActive: true } })
  if (exclude) and.push({ NOT: { id: exclude } })
  const where: Prisma.PhotoWhereInput = { isActive: true, kind: kind ?? 'GOWN', AND: and }

  const orderBy: Prisma.PhotoOrderByWithRelationInput[] =
    sort === 'oldest'
      ? [{ createdAt: 'asc' }]
      : sort === 'az'
        ? [{ title: 'asc' }]
        : sort === 'price-asc'
          ? [{ price: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
          : sort === 'price-desc'
            ? [{ price: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }]

  const [total, rows] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({ where, orderBy: [...orderBy, { id: 'asc' }], skip: offset, take: limit, include: photoInclude }),
  ])

  const body: PhotoPage = {
    items: rows.map((p) => toPhotoDTO(p, { onlyActiveTags: true })),
    total,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
  }
  res.set('Cache-Control', cache(30)).json(body)
})

publicRouter.get('/catalog/photos/:slug', async (req, res) => {
  const slug = z.string().max(120).parse(req.params.slug)
  const photo = await prisma.photo.findFirst({ where: { slug, isActive: true }, include: photoInclude })
  if (!photo) throw new HttpError(404, 'Look ini tidak ditemukan.')
  res.set('Cache-Control', cache(60)).json(toPhotoDTO(photo, { onlyActiveTags: true }))
})

export async function sitemapHandler(req: import('express').Request, res: import('express').Response) {
  const base = siteUrl() || `${req.protocol}://${req.get('host')}`
  const [photos, chapters] = await Promise.all([
    prisma.photo.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { createdAt: 'desc' } }),
    prisma.chapter.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ])
  const page = (path: string, priority: string) => `<url><loc>${base}${path}</loc><priority>${priority}</priority></url>`
  const urls = [
    page('/', '1.0'),
    page('/catalog', '0.9'),
    page('/chapters', '0.8'),
    page('/add-on', '0.6'),
    page('/cara-sewa', '0.6'),
    page('/fitting-online', '0.5'),
    page('/tentang-kami', '0.5'),
    ...chapters.map((c) => `<url><loc>${base}/chapters/${encodeURIComponent(c.slug)}</loc><lastmod>${c.updatedAt.toISOString()}</lastmod></url>`),
    ...photos.map((p) => `<url><loc>${base}/catalog/${encodeURIComponent(p.slug)}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`),
  ]
  res
    .type('application/xml')
    .set('Cache-Control', cache(3600))
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`)
}
