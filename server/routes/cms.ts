// Admin: galeri foto produk, chapter, testimoni, "worn by", dan konten halaman.
import { Router, type Request } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http.js'
import { requireAuth } from '../auth.js'
import { MAX_UPLOAD_BYTES } from '../env.js'
import { processAndStore } from '../images.js'
import { deleteUnreferenced } from '../cleanup.js'
import { photoInclude, toAdminPhotoDTO } from '../photos.js'
import { listChapters, showcaseInclude, toChapterDTO, toShowcaseDTO, toTestimonialDTO } from '../cms.js'
import { getContent, saveContent } from '../settings.js'
import { cleanStr, optionalText, slugify } from '../text.js'
import { CONTENT_LIST_KEYS, CONTENT_TEXT_KEYS } from '../../shared/content.js'

export const cmsRouter = Router()
cmsRouter.use(requireAuth())

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 20 } })
const id = z.string().min(1).max(40)
const bool = (v: unknown) => (v === undefined || v === '' ? undefined : v === true || v === 'true')
const num = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v))

/** Ambil body baik dari JSON maupun multipart (semua string). */
const fields = (req: Request) => (req.body ?? {}) as Record<string, unknown>

// ───────────────────────── Galeri foto produk ─────────────────────────

cmsRouter.post('/photos/:id/images', upload.single('file'), async (req, res) => {
  const photoId = id.parse(req.params.id)
  if (!req.file) throw new HttpError(400, 'File foto wajib diunggah.')
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { slug: true, _count: { select: { images: true } } } })
  if (!photo) throw new HttpError(404, 'Foto tidak ditemukan.')
  if (photo._count.images >= 12) throw new HttpError(400, 'Maksimal 12 foto tambahan per produk.')

  const image = await processAndStore(req.file, `${photo.slug}-g`)
  const { storageKey: _key, ...data } = image
  await prisma.photoImage.create({ data: { ...data, photoId, sortOrder: photo._count.images + 1 } })
  const updated = await prisma.photo.findUniqueOrThrow({ where: { id: photoId }, include: photoInclude })
  res.status(201).json(toAdminPhotoDTO(updated))
})

cmsRouter.delete('/photos/:id/images/:imageId', async (req, res) => {
  const photoId = id.parse(req.params.id)
  const image = await prisma.photoImage.findFirst({ where: { id: id.parse(req.params.imageId), photoId } })
  if (!image) throw new HttpError(404, 'Foto tidak ditemukan.')
  await prisma.photoImage.delete({ where: { id: image.id } })
  await deleteUnreferenced([image.imageUrl, image.thumbnailUrl])
  const updated = await prisma.photo.findUniqueOrThrow({ where: { id: photoId }, include: photoInclude })
  res.json(toAdminPhotoDTO(updated))
})

/** Jadikan foto galeri sebagai foto utama (tukar posisi). */
cmsRouter.post('/photos/:id/images/:imageId/primary', async (req, res) => {
  const photoId = id.parse(req.params.id)
  const [photo, image] = await Promise.all([
    prisma.photo.findUnique({ where: { id: photoId } }),
    prisma.photoImage.findFirst({ where: { id: id.parse(req.params.imageId), photoId } }),
  ])
  if (!photo || !image) throw new HttpError(404, 'Foto tidak ditemukan.')
  const swap = (x: typeof photo | typeof image) => ({
    imageUrl: x.imageUrl,
    thumbnailUrl: x.thumbnailUrl,
    blurDataUrl: x.blurDataUrl,
    width: x.width,
    height: x.height,
    sizeBytes: x.sizeBytes,
  })
  await prisma.$transaction([
    prisma.photo.update({ where: { id: photoId }, data: swap(image) }),
    prisma.photoImage.update({ where: { id: image.id }, data: swap(photo) }),
  ])
  const updated = await prisma.photo.findUniqueOrThrow({ where: { id: photoId }, include: photoInclude })
  res.json(toAdminPhotoDTO(updated))
})

// ───────────────────────── Chapter ─────────────────────────

cmsRouter.get('/chapters', async (_req, res) => {
  res.json(await listChapters({ onlyActive: false }))
})

const chapterBody = z.object({
  name: cleanStr(60).pipe(z.string().min(1, 'Nama wajib diisi')),
  slug: z.string().max(60).optional(),
  numeral: optionalText(12),
  description: optionalText(600),
  sortOrder: z.number().int().min(0).max(999).optional(),
  showInNav: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

function parseChapter(req: Request, partial: boolean) {
  const f = fields(req)
  const schema = partial ? chapterBody.partial() : chapterBody
  return schema.parse({
    ...f,
    sortOrder: num(f.sortOrder),
    showInNav: bool(f.showInNav),
    isActive: bool(f.isActive),
  })
}

async function storeCover(req: Request, slug: string) {
  if (!req.file) return undefined
  const img = await processAndStore(req.file, `chapter-${slug}`)
  return { coverUrl: img.imageUrl, coverThumb: img.thumbnailUrl, coverBlur: img.blurDataUrl, coverBytes: img.sizeBytes }
}

cmsRouter.post('/chapters', upload.single('cover'), async (req, res) => {
  const body = parseChapter(req, false) as z.infer<typeof chapterBody>
  const slug = slugify(body.slug || body.name)
  if (!slug) throw new HttpError(400, 'Slug tidak valid.')
  const cover = await storeCover(req, slug)
  const chapter = await prisma.chapter.create({
    data: {
      name: body.name,
      slug,
      numeral: body.numeral ?? null,
      description: body.description ?? null,
      sortOrder: body.sortOrder ?? (await prisma.chapter.count()),
      showInNav: body.showInNav ?? false,
      isActive: body.isActive ?? true,
      ...cover,
    },
  })
  res.status(201).json(toChapterDTO(chapter))
})

cmsRouter.patch('/chapters/:id', upload.single('cover'), async (req, res) => {
  const chapterId = id.parse(req.params.id)
  const body = parseChapter(req, true)
  const current = await prisma.chapter.findUnique({ where: { id: chapterId } })
  if (!current) throw new HttpError(404, 'Chapter tidak ditemukan.')
  const cover = await storeCover(req, current.slug)
  const removeCover = fields(req).removeCover === 'true' || fields(req).removeCover === true
  const chapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      name: body.name,
      slug: body.slug ? slugify(body.slug) || undefined : undefined,
      numeral: body.numeral,
      description: body.description,
      sortOrder: body.sortOrder,
      showInNav: body.showInNav,
      isActive: body.isActive,
      ...(cover ?? (removeCover ? { coverUrl: null, coverThumb: null, coverBlur: null, coverBytes: 0 } : {})),
    },
  })
  if (cover || removeCover) await deleteUnreferenced([current.coverUrl, current.coverThumb])
  res.json(toChapterDTO(chapter))
})

cmsRouter.delete('/chapters/:id', async (req, res) => {
  const chapter = await prisma.chapter.delete({ where: { id: id.parse(req.params.id) } })
  await deleteUnreferenced([chapter.coverUrl, chapter.coverThumb])
  res.json({ ok: true })
})

// ───────────────────────── Testimoni ─────────────────────────

cmsRouter.get('/testimonials', async (_req, res) => {
  const rows = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  res.json(rows.map(toTestimonialDTO))
})

const testimonialBody = z.object({
  name: cleanStr(60).pipe(z.string().min(1, 'Nama wajib diisi')),
  body: cleanStr(800).pipe(z.string().min(1, 'Isi testimoni wajib diisi')),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
})

const parseTestimonial = (req: Request, partial: boolean) => {
  const f = fields(req)
  return (partial ? testimonialBody.partial() : testimonialBody).parse({ ...f, sortOrder: num(f.sortOrder), isActive: bool(f.isActive) })
}

async function storeTestimonialPhoto(req: Request) {
  if (!req.file) return undefined
  const img = await processAndStore(req.file, 'testimoni')
  return { photoUrl: img.imageUrl, photoThumb: img.thumbnailUrl, photoBlur: img.blurDataUrl, photoBytes: img.sizeBytes }
}

cmsRouter.post('/testimonials', upload.single('photo'), async (req, res) => {
  const body = parseTestimonial(req, false) as z.infer<typeof testimonialBody>
  const photo = await storeTestimonialPhoto(req)
  const row = await prisma.testimonial.create({
    data: { name: body.name, body: body.body, isActive: body.isActive ?? true, sortOrder: body.sortOrder ?? 0, ...photo },
  })
  res.status(201).json(toTestimonialDTO(row))
})

cmsRouter.patch('/testimonials/:id', upload.single('photo'), async (req, res) => {
  const rowId = id.parse(req.params.id)
  const body = parseTestimonial(req, true)
  const current = await prisma.testimonial.findUnique({ where: { id: rowId } })
  if (!current) throw new HttpError(404, 'Testimoni tidak ditemukan.')
  const photo = await storeTestimonialPhoto(req)
  const removePhoto = fields(req).removePhoto === 'true'
  const row = await prisma.testimonial.update({
    where: { id: rowId },
    data: {
      ...body,
      ...(photo ?? (removePhoto ? { photoUrl: null, photoThumb: null, photoBlur: null, photoBytes: 0 } : {})),
    },
  })
  if (photo || removePhoto) await deleteUnreferenced([current.photoUrl, current.photoThumb])
  res.json(toTestimonialDTO(row))
})

cmsRouter.delete('/testimonials/:id', async (req, res) => {
  const row = await prisma.testimonial.delete({ where: { id: id.parse(req.params.id) } })
  await deleteUnreferenced([row.photoUrl, row.photoThumb])
  res.json({ ok: true })
})

// ───────────────────────── Worn by ─────────────────────────

cmsRouter.get('/showcases', async (_req, res) => {
  const rows = await prisma.showcase.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], include: showcaseInclude })
  res.json(rows.map((r) => toShowcaseDTO(r)))
})

const showcaseBody = z.object({
  name: cleanStr(60).pipe(z.string().min(1, 'Nama wajib diisi')),
  caption: optionalText(200),
  photoId: z.union([id, z.null()]).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
})

const parseShowcase = (req: Request, partial: boolean) => {
  const f = fields(req)
  return (partial ? showcaseBody.partial() : showcaseBody).parse({
    ...f,
    photoId: f.photoId === '' ? null : f.photoId,
    sortOrder: num(f.sortOrder),
    isActive: bool(f.isActive),
  })
}

cmsRouter.post('/showcases', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Foto wajib diunggah.')
  const body = parseShowcase(req, false) as z.infer<typeof showcaseBody>
  const { storageKey: _key, ...img } = await processAndStore(req.file, `worn-${slugify(body.name)}`)
  const row = await prisma.showcase.create({
    data: {
      name: body.name,
      caption: body.caption ?? null,
      photoId: body.photoId ?? null,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      ...img,
    },
    include: showcaseInclude,
  })
  res.status(201).json(toShowcaseDTO(row))
})

cmsRouter.patch('/showcases/:id', upload.single('file'), async (req, res) => {
  const rowId = id.parse(req.params.id)
  const body = parseShowcase(req, true)
  const current = await prisma.showcase.findUnique({ where: { id: rowId } })
  if (!current) throw new HttpError(404, 'Data tidak ditemukan.')
  let img: Omit<Awaited<ReturnType<typeof processAndStore>>, 'storageKey'> | undefined
  if (req.file) {
    const { storageKey: _key, ...rest } = await processAndStore(req.file, `worn-${current.id}`)
    img = rest
  }
  const row = await prisma.showcase.update({ where: { id: rowId }, data: { ...body, ...img }, include: showcaseInclude })
  if (img) await deleteUnreferenced([current.imageUrl, current.thumbnailUrl])
  res.json(toShowcaseDTO(row))
})

cmsRouter.delete('/showcases/:id', async (req, res) => {
  const row = await prisma.showcase.delete({ where: { id: id.parse(req.params.id) } })
  await deleteUnreferenced([row.imageUrl, row.thumbnailUrl])
  res.json({ ok: true })
})

// ───────────────────────── Konten halaman ─────────────────────────

const item = z.object({ title: cleanStr(120), body: cleanStr(1200) })
const localized = (required: boolean) =>
  z.object({
    ...Object.fromEntries(CONTENT_TEXT_KEYS.map((k) => [k, required ? cleanStr(1200) : cleanStr(1200).optional()])),
    ...Object.fromEntries(CONTENT_LIST_KEYS.map((k) => [k, required ? z.array(item).max(30) : z.array(item).max(30).optional()])),
  })

const contentBody = z.object({ id: localized(true), en: localized(false) })

cmsRouter.get('/content', async (_req, res) => {
  res.json(await getContent())
})

cmsRouter.put('/content', requireAuth(['ADMIN']), async (req, res) => {
  const parsed = contentBody.parse(req.body)
  if (parsed.id.periodGuide && (parsed.id.periodGuide as unknown[]).length !== 3) {
    throw new HttpError(400, 'Panduan periode harus berisi tepat 3 hari.')
  }
  res.json(await saveContent(parsed as never))
})
