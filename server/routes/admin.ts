import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { HttpError } from '../http.js'
import { requireAuth } from '../auth.js'
import { MAX_UPLOAD_BYTES } from '../env.js'
import { processAndStore } from '../images.js'
import { storageDriver } from '../storage.js'
import { deleteUnreferenced } from '../cleanup.js'
import { photoInclude, searchWhere, toAdminPhotoDTO, uniquePhotoSlug } from '../photos.js'
import { getSettings, saveSettings } from '../settings.js'
import { cleanStr, optionalText, slugify } from '../text.js'
import type { AdminCategory, AdminStats, PhotoPage, AdminPhotoDTO } from '../../shared/types.js'

export const adminRouter = Router()
adminRouter.use(requireAuth())
adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 30 },
})

const id = z.string().min(1).max(40)
const idList = z.array(id).max(500)

// ───────────────────────── Dashboard ─────────────────────────

adminRouter.get('/stats', async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [totalPhotos, activePhotos, totalAddons, totalTags, totalCategories, totalChapters, untaggedCount, addedThisWeek, storage, recent, untagged, top, gallery, covers] =
    await Promise.all([
      prisma.photo.count({ where: { kind: 'GOWN' } }),
      prisma.photo.count({ where: { isActive: true, kind: 'GOWN' } }),
      prisma.photo.count({ where: { kind: 'ADDON' } }),
      prisma.tag.count(),
      prisma.tagCategory.count(),
      prisma.chapter.count(),
      prisma.photo.count({ where: { tags: { none: {} } } }),
      prisma.photo.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.photo.aggregate({ _sum: { sizeBytes: true } }),
      prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: photoInclude }),
      prisma.photo.findMany({ where: { tags: { none: {} } }, orderBy: { createdAt: 'desc' }, take: 6, include: photoInclude }),
      prisma.photoTag.groupBy({ by: ['tagId'], _count: { _all: true }, orderBy: { _count: { tagId: 'desc' } }, take: 6 }),
      prisma.photoImage.aggregate({ _sum: { sizeBytes: true } }),
      Promise.all([
        prisma.chapter.aggregate({ _sum: { coverBytes: true } }),
        prisma.testimonial.aggregate({ _sum: { photoBytes: true } }),
        prisma.showcase.aggregate({ _sum: { sizeBytes: true } }),
      ]),
    ])

  const topTagRows = await prisma.tag.findMany({ where: { id: { in: top.map((t) => t.tagId) } }, include: { category: true } })
  const topTags = top
    .map((t) => {
      const tag = topTagRows.find((r) => r.id === t.tagId)
      return tag ? { id: tag.id, name: tag.name, categoryName: tag.category.name, count: t._count._all } : null
    })
    .filter((t): t is NonNullable<typeof t> => !!t)

  const body: AdminStats = {
    totalPhotos,
    activePhotos,
    totalAddons,
    totalTags,
    totalCategories,
    totalChapters,
    untaggedCount,
    addedThisWeek,
    storageBytes:
      (storage._sum.sizeBytes ?? 0) +
      (gallery._sum.sizeBytes ?? 0) +
      (covers[0]._sum.coverBytes ?? 0) +
      (covers[1]._sum.photoBytes ?? 0) +
      (covers[2]._sum.sizeBytes ?? 0),
    recent: recent.map(toAdminPhotoDTO),
    untagged: untagged.map(toAdminPhotoDTO),
    topTags,
  }
  res.json(body)
})

// ───────────────────────── Photos ─────────────────────────

const photoListQuery = z.object({
  q: z.string().max(100).optional(),
  tag: z.string().max(40).optional(), // id tag, atau "none" untuk foto tanpa tag
  status: z.enum(['all', 'active', 'hidden', 'featured']).default('all'),
  kind: z.enum(['all', 'gown', 'addon']).default('all'),
  chapter: z.string().max(40).optional(), // id chapter, atau "none"
  sort: z.enum(['newest', 'oldest', 'az', 'za']).default('newest'),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(40),
})

adminRouter.get('/photos', async (req, res) => {
  const { q, tag, status, kind, chapter, sort, offset, limit } = photoListQuery.parse(req.query)
  const and: Prisma.PhotoWhereInput[] = []
  const search = searchWhere(q)
  if (search) and.push(search)
  if (tag === 'none') and.push({ tags: { none: {} } })
  else if (tag) and.push({ tags: { some: { tagId: tag } } })
  if (status === 'featured') and.push({ isFeatured: true })
  else if (status !== 'all') and.push({ isActive: status === 'active' })
  if (kind !== 'all') and.push({ kind: kind === 'addon' ? 'ADDON' : 'GOWN' })
  if (chapter === 'none') and.push({ chapterId: null })
  else if (chapter) and.push({ chapterId: chapter })

  const orderBy: Prisma.PhotoOrderByWithRelationInput =
    sort === 'oldest' ? { createdAt: 'asc' } : sort === 'az' ? { title: 'asc' } : sort === 'za' ? { title: 'desc' } : { createdAt: 'desc' }

  const where = { AND: and }
  const [total, rows] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({ where, orderBy: [orderBy, { id: 'asc' }], skip: offset, take: limit, include: photoInclude }),
  ])
  const body: PhotoPage<AdminPhotoDTO> = {
    items: rows.map(toAdminPhotoDTO),
    total,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
  }
  res.json(body)
})

adminRouter.get('/photos/:id', async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: id.parse(req.params.id) }, include: photoInclude })
  if (!photo) throw new HttpError(404, 'Foto tidak ditemukan.')
  res.json(toAdminPhotoDTO(photo))
})

const priceField = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, ''))
    if (!Number.isFinite(n) || n < 0 || n > 2_000_000_000) {
      ctx.addIssue({ code: 'custom', message: 'Harga tidak valid' })
      return z.NEVER
    }
    return Math.round(n)
  })

const photoMeta = z.object({
  title: cleanStr(120).optional(),
  description: optionalText(2000),
  chapterId: z.union([id, z.null()]).optional(),
  kind: z.enum(['GOWN', 'ADDON']).optional(),
  price: priceField,
  deposit: priceField,
  bust: optionalText(40),
  waist: optionalText(40),
  length: optionalText(40),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tagIds: idList.optional(),
})

// Multipart mengirim semua field sebagai string → ubah dulu ke tipe yang benar.
function parseMultipartMeta(body: Record<string, unknown>) {
  let tagIds: unknown
  try {
    tagIds = typeof body.tagIds === 'string' && body.tagIds ? JSON.parse(body.tagIds) : undefined
  } catch {
    throw new HttpError(400, 'Format tag tidak valid.')
  }
  const bool = (v: unknown) => (v === undefined ? undefined : v === 'true')
  return photoMeta.parse({
    ...body,
    tagIds,
    isActive: bool(body.isActive),
    isFeatured: bool(body.isFeatured),
    chapterId: body.chapterId === '' ? null : body.chapterId,
  })
}

async function assertChapterExists(chapterId: string | null | undefined) {
  if (!chapterId) return
  if (!(await prisma.chapter.findUnique({ where: { id: chapterId }, select: { id: true } }))) {
    throw new HttpError(400, 'Chapter tidak ditemukan.')
  }
}

async function assertTagsExist(tagIds: string[] | undefined) {
  if (!tagIds?.length) return
  const count = await prisma.tag.count({ where: { id: { in: tagIds } } })
  if (count !== new Set(tagIds).size) throw new HttpError(400, 'Beberapa tag tidak ditemukan.')
}

function titleFromFilename(name: string | undefined): string | null {
  if (!name) return null
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
  // Nama bawaan kamera (IMG_1234, DSC0001, PXL_2026…) tidak berguna sebagai judul.
  if (!base || /^(img|dsc|dscn|pxl|photo|image|screenshot|wa|whatsapp|signal)\b|^\d+$/i.test(base)) return null
  return base.slice(0, 120)
}

adminRouter.post('/photos', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'File foto wajib diunggah.')
  const meta = parseMultipartMeta(req.body ?? {})
  await assertTagsExist(meta.tagIds)
  await assertChapterExists(meta.chapterId)

  let title = meta.title || titleFromFilename(req.file.originalname)
  if (!title) {
    const n = (await prisma.photo.count()) + 1
    title = `Look ${String(n).padStart(3, '0')}`
  }
  const slug = await uniquePhotoSlug(title)
  const image = await processAndStore(req.file, slug)

  try {
    const photo = await prisma.photo.create({
      data: {
        title,
        slug,
        kind: meta.kind ?? 'GOWN',
        description: meta.description ?? null,
        chapterId: meta.chapterId ?? null,
        price: meta.price ?? null,
        deposit: meta.deposit ?? null,
        bust: meta.bust ?? null,
        waist: meta.waist ?? null,
        length: meta.length ?? null,
        isActive: meta.isActive ?? true,
        isFeatured: meta.isFeatured ?? false,
        ...image,
        tags: meta.tagIds?.length ? { create: [...new Set(meta.tagIds)].map((tagId) => ({ tagId })) } : undefined,
      },
      include: photoInclude,
    })
    res.status(201).json(toAdminPhotoDTO(photo))
  } catch (err) {
    await deleteUnreferenced([image.imageUrl, image.thumbnailUrl])
    throw err
  }
})

adminRouter.patch('/photos/:id', async (req, res) => {
  const photoId = id.parse(req.params.id)
  const meta = photoMeta.parse(req.body)
  await assertTagsExist(meta.tagIds)
  await assertChapterExists(meta.chapterId)

  const current = await prisma.photo.findUnique({ where: { id: photoId }, select: { title: true } })
  if (!current) throw new HttpError(404, 'Foto tidak ditemukan.')

  const data: Prisma.PhotoUncheckedUpdateInput = {
    kind: meta.kind,
    description: meta.description,
    chapterId: meta.chapterId,
    price: meta.price,
    deposit: meta.deposit,
    bust: meta.bust,
    waist: meta.waist,
    length: meta.length,
    isActive: meta.isActive,
    isFeatured: meta.isFeatured,
  }
  if (meta.title && meta.title !== current.title) {
    data.title = meta.title
    data.slug = await uniquePhotoSlug(meta.title, photoId)
  }

  const photo = await prisma.$transaction(async (tx) => {
    if (meta.tagIds) {
      await tx.photoTag.deleteMany({ where: { photoId } })
      if (meta.tagIds.length) {
        await tx.photoTag.createMany({ data: [...new Set(meta.tagIds)].map((tagId) => ({ photoId, tagId })) })
      }
    }
    return tx.photo.update({ where: { id: photoId }, data, include: photoInclude })
  })
  res.json(toAdminPhotoDTO(photo))
})

adminRouter.put('/photos/:id/image', upload.single('file'), async (req, res) => {
  const photoId = id.parse(req.params.id)
  if (!req.file) throw new HttpError(400, 'File foto wajib diunggah.')
  const current = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!current) throw new HttpError(404, 'Foto tidak ditemukan.')

  const image = await processAndStore(req.file, current.slug)
  const photo = await prisma.photo.update({ where: { id: photoId }, data: image, include: photoInclude })
  await deleteUnreferenced([current.imageUrl, current.thumbnailUrl])
  res.json(toAdminPhotoDTO(photo))
})

adminRouter.delete('/photos/:id', async (req, res) => {
  const photoId = id.parse(req.params.id)
  const photo = await prisma.photo.delete({ where: { id: photoId }, include: { images: true } })
  await deleteUnreferenced([photo.imageUrl, photo.thumbnailUrl, ...photo.images.flatMap((i) => [i.imageUrl, i.thumbnailUrl])])
  res.json({ ok: true })
})

const bulkBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('delete'), ids: idList.min(1) }),
  z.object({ action: z.literal('addTags'), ids: idList.min(1), tagIds: idList.min(1) }),
  z.object({ action: z.literal('removeTags'), ids: idList.min(1), tagIds: idList.min(1) }),
  z.object({ action: z.literal('setActive'), ids: idList.min(1), isActive: z.boolean() }),
  z.object({ action: z.literal('setChapter'), ids: idList.min(1), chapterId: z.union([id, z.null()]) }),
])

adminRouter.post('/photos/bulk', async (req, res) => {
  const body = bulkBody.parse(req.body)
  const ids = [...new Set(body.ids)]

  switch (body.action) {
    case 'delete': {
      const photos = await prisma.photo.findMany({
        where: { id: { in: ids } },
        select: { imageUrl: true, thumbnailUrl: true, images: { select: { imageUrl: true, thumbnailUrl: true } } },
      })
      const { count } = await prisma.photo.deleteMany({ where: { id: { in: ids } } })
      await deleteUnreferenced(photos.flatMap((p) => [p.imageUrl, p.thumbnailUrl, ...p.images.flatMap((i) => [i.imageUrl, i.thumbnailUrl])]))
      res.json({ count })
      return
    }
    case 'addTags': {
      await assertTagsExist(body.tagIds)
      const data = ids.flatMap((photoId) => [...new Set(body.tagIds)].map((tagId) => ({ photoId, tagId })))
      const { count } = await prisma.photoTag.createMany({ data, skipDuplicates: true })
      await prisma.photo.updateMany({ where: { id: { in: ids } }, data: { updatedAt: new Date() } })
      res.json({ count })
      return
    }
    case 'removeTags': {
      const { count } = await prisma.photoTag.deleteMany({ where: { photoId: { in: ids }, tagId: { in: body.tagIds } } })
      res.json({ count })
      return
    }
    case 'setChapter': {
      await assertChapterExists(body.chapterId)
      const { count } = await prisma.photo.updateMany({ where: { id: { in: ids } }, data: { chapterId: body.chapterId } })
      res.json({ count })
      return
    }
    case 'setActive': {
      const { count } = await prisma.photo.updateMany({ where: { id: { in: ids } }, data: { isActive: body.isActive } })
      res.json({ count })
      return
    }
  }
})

// ───────────────────────── Tags ─────────────────────────

adminRouter.get('/tags', async (_req, res) => {
  const [categories, counts] = await Promise.all([
    prisma.tagCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { tags: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    }),
    prisma.photoTag.groupBy({ by: ['tagId'], _count: { _all: true } }),
  ])
  const countMap = new Map(counts.map((c) => [c.tagId, c._count._all]))
  const body: AdminCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sortOrder: c.sortOrder,
    tags: c.tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
      photoCount: countMap.get(t.id) ?? 0,
    })),
  }))
  res.json(body)
})

const slugField = z
  .string()
  .max(60)
  .optional()
  .transform((v) => (v ? slugify(v) : undefined))

const categoryBody = z.object({ name: cleanStr(40).pipe(z.string().min(1, 'Nama wajib diisi')), slug: slugField, sortOrder: z.number().int().min(0).max(999).optional() })

adminRouter.post('/categories', async (req, res) => {
  const body = categoryBody.parse(req.body)
  const slug = body.slug || slugify(body.name)
  if (!slug) throw new HttpError(400, 'Slug tidak valid.')
  const sortOrder = body.sortOrder ?? (await prisma.tagCategory.count())
  const category = await prisma.tagCategory.create({ data: { name: body.name, slug, sortOrder } })
  res.status(201).json(category)
})

adminRouter.patch('/categories/:id', async (req, res) => {
  const body = categoryBody.partial().parse(req.body)
  const category = await prisma.tagCategory.update({
    where: { id: id.parse(req.params.id) },
    data: { name: body.name, slug: body.slug || undefined, sortOrder: body.sortOrder },
  })
  res.json(category)
})

adminRouter.delete('/categories/:id', async (req, res) => {
  await prisma.tagCategory.delete({ where: { id: id.parse(req.params.id) } })
  res.json({ ok: true })
})

const tagBody = z.object({
  name: cleanStr(40).pipe(z.string().min(1, 'Nama wajib diisi')),
  slug: slugField,
  categoryId: id,
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
})

adminRouter.post('/tags', async (req, res) => {
  const body = tagBody.parse(req.body)
  const slug = body.slug || slugify(body.name)
  if (!slug) throw new HttpError(400, 'Slug tidak valid.')
  const sortOrder = body.sortOrder ?? (await prisma.tag.count({ where: { categoryId: body.categoryId } }))
  const tag = await prisma.tag.create({
    data: { name: body.name, slug, categoryId: body.categoryId, isActive: body.isActive ?? true, sortOrder },
  })
  res.status(201).json(tag)
})

adminRouter.patch('/tags/:id', async (req, res) => {
  const body = tagBody.partial().parse(req.body)
  const tag = await prisma.tag.update({
    where: { id: id.parse(req.params.id) },
    data: { name: body.name, slug: body.slug || undefined, categoryId: body.categoryId, isActive: body.isActive, sortOrder: body.sortOrder },
  })
  res.json(tag)
})

adminRouter.delete('/tags/:id', async (req, res) => {
  await prisma.tag.delete({ where: { id: id.parse(req.params.id) } })
  res.json({ ok: true })
})

// ───────────────────────── Settings ─────────────────────────

adminRouter.get('/settings', async (_req, res) => {
  res.json({ settings: await getSettings(), storageDriver: storageDriver() })
})

const settingsBody = z.object({
  brandName: cleanStr(60).optional(),
  tagline: cleanStr(120).optional(),
  heroLine1: cleanStr(60).optional(),
  heroLine2: cleanStr(80).optional(),
  heroNote: cleanStr(240).optional(),
  whatsapp: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v === undefined ? v : v.replace(/[^\d]/g, ''))),
  instagram: z
    .string()
    .max(60)
    .optional()
    .transform((v) => (v === undefined ? v : v.replace(/^@/, '').replace(/[^\w.]/g, ''))),
  city: cleanStr(60).optional(),
  rentalDays: z
    .string()
    .max(3)
    .optional()
    .transform((v) => (v === undefined ? v : v.replace(/[^\d]/g, '') || '3')),
})

adminRouter.put('/settings', requireAuth(['ADMIN']), async (req, res) => {
  res.json({ settings: await saveSettings(settingsBody.parse(req.body)), storageDriver: storageDriver() })
})
