// Salin isi katalog LOKAL (database + folder ./uploads) ke PRODUKSI (Neon + Vercel Blob).
//
//   1. npx vercel login
//   2. npx vercel link
//   3. npx vercel env pull .env.production.local --environment=production
//   4. npm run db:push-prod            → simulasi (tidak mengubah apa pun)
//      npm run db:push-prod -- --apply → jalankan sungguhan
//
// Aman diulang: data dicocokkan lewat slug, jadi yang sudah ada di produksi dilewati.
// Akun admin TIDAK disalin (admin produksi dibuat dari env ADMIN_EMAIL/ADMIN_PASSWORD).
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { put } from '@vercel/blob'

const APPLY = process.argv.includes('--apply')
const ROOT = process.cwd()
const UPLOADS = path.join(ROOT, 'uploads')

function readEnv(file: string): Record<string, string> {
  const full = path.join(ROOT, file)
  if (!existsSync(full)) throw new Error(`File ${file} tidak ditemukan.`)
  const out: Record<string, string> = {}
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2]!
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]!] = v.replace(/\\n/g, '\n')
  }
  return out
}

const local = readEnv('.env')
const prod = readEnv('.env.production.local')
if (!prod.DATABASE_URL) throw new Error('DATABASE_URL produksi kosong di .env.production.local')
if (!prod.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN kosong — hubungkan Vercel Blob ke project lalu pull ulang env.')
if (prod.DATABASE_URL === local.DATABASE_URL) throw new Error('DATABASE_URL lokal dan produksi sama — dibatalkan.')

const src = new PrismaClient({ datasourceUrl: local.DATABASE_URL })
const dst = new PrismaClient({ datasourceUrl: prod.DATABASE_URL })

// ── Upload file lokal ke Blob (sekali per URL) ──
const uploaded = new Map<string, string>()
let uploadCount = 0
let uploadBytes = 0

async function migrateUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith('/uploads/')) return url
  const cached = uploaded.get(url)
  if (cached) return cached
  const file = path.join(UPLOADS, url.slice('/uploads/'.length))
  if (!existsSync(file)) {
    console.warn(`  ! file hilang: ${url}`)
    return null
  }
  const body = readFileSync(file)
  uploadCount++
  uploadBytes += body.length
  if (!APPLY) {
    uploaded.set(url, url)
    return url
  }
  const blob = await put(url.slice('/uploads/'.length), body, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    token: prod.BLOB_READ_WRITE_TOKEN,
  })
  uploaded.set(url, blob.url)
  return blob.url
}

const stats: Record<string, { created: number; skipped: number }> = {}
const count = (k: string, created: boolean) => {
  stats[k] ??= { created: 0, skipped: 0 }
  stats[k][created ? 'created' : 'skipped']++
}

async function main() {
  console.log(APPLY ? '▶ Menyalin data lokal ke produksi…' : '▶ SIMULASI (tambahkan --apply untuk menjalankan sungguhan)')
  console.log(`  dari: ${local.DATABASE_URL!.replace(/:[^:@/]+@/, ':***@')}`)
  console.log(`  ke  : ${prod.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}\n`)

  // 1. Kategori & tag (cocokkan lewat slug)
  const catMap = new Map<string, string>()
  const tagMap = new Map<string, string>()
  for (const c of await src.tagCategory.findMany({ include: { tags: true } })) {
    let target = await dst.tagCategory.findUnique({ where: { slug: c.slug } })
    count('kategori tag', !target)
    if (!target && APPLY) target = await dst.tagCategory.create({ data: { name: c.name, slug: c.slug, sortOrder: c.sortOrder } })
    const catId = target?.id ?? `new-${c.id}`
    catMap.set(c.id, catId)
    for (const t of c.tags) {
      let tag = target ? await dst.tag.findUnique({ where: { categoryId_slug: { categoryId: catId, slug: t.slug } } }) : null
      count('tag', !tag)
      if (!tag && APPLY) {
        tag = await dst.tag.create({ data: { name: t.name, slug: t.slug, categoryId: catId, sortOrder: t.sortOrder, isActive: t.isActive } })
      }
      tagMap.set(t.id, tag?.id ?? `new-${t.id}`)
    }
  }

  // 2. Chapter
  const chapterMap = new Map<string, string>()
  for (const c of await src.chapter.findMany()) {
    let target = await dst.chapter.findUnique({ where: { slug: c.slug } })
    count('chapter', !target)
    if (!target) {
      const coverUrl = await migrateUrl(c.coverUrl)
      const coverThumb = await migrateUrl(c.coverThumb)
      if (APPLY) {
        target = await dst.chapter.create({
          data: {
            name: c.name,
            slug: c.slug,
            numeral: c.numeral,
            description: c.description,
            coverUrl,
            coverThumb,
            coverBlur: c.coverBlur,
            coverBytes: c.coverBytes,
            sortOrder: c.sortOrder,
            showInNav: c.showInNav,
            isActive: c.isActive,
          },
        })
      }
    }
    chapterMap.set(c.id, target?.id ?? `new-${c.id}`)
  }

  // 3. Foto / produk + galeri + tag
  const photoMap = new Map<string, string>()
  const photos = await src.photo.findMany({ include: { tags: true, images: true }, orderBy: { createdAt: 'asc' } })
  for (const [i, p] of photos.entries()) {
    const existing = await dst.photo.findUnique({ where: { slug: p.slug }, select: { id: true } })
    count('foto', !existing)
    if (existing) {
      photoMap.set(p.id, existing.id)
      continue
    }
    const imageUrl = await migrateUrl(p.imageUrl)
    const thumbnailUrl = await migrateUrl(p.thumbnailUrl)
    if (!imageUrl || !thumbnailUrl) {
      console.warn(`  ! lewati "${p.title}" — file gambar tidak ada`)
      continue
    }
    const images = []
    for (const g of p.images) {
      const gi = await migrateUrl(g.imageUrl)
      const gt = await migrateUrl(g.thumbnailUrl)
      if (gi && gt) images.push({ ...g, imageUrl: gi, thumbnailUrl: gt })
    }
    if (APPLY) {
      const created = await dst.photo.create({
        data: {
          kind: p.kind,
          title: p.title,
          slug: p.slug,
          description: p.description,
          chapterId: p.chapterId ? chapterMap.get(p.chapterId) : null,
          price: p.price,
          deposit: p.deposit,
          bust: p.bust,
          waist: p.waist,
          length: p.length,
          imageUrl,
          thumbnailUrl,
          blurDataUrl: p.blurDataUrl,
          width: p.width,
          height: p.height,
          sizeBytes: p.sizeBytes,
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          createdAt: p.createdAt,
          tags: { create: p.tags.map((t) => ({ tagId: tagMap.get(t.tagId)! })).filter((t) => t.tagId) },
          images: {
            create: images.map((g) => ({
              imageUrl: g.imageUrl,
              thumbnailUrl: g.thumbnailUrl,
              blurDataUrl: g.blurDataUrl,
              width: g.width,
              height: g.height,
              sizeBytes: g.sizeBytes,
              sortOrder: g.sortOrder,
            })),
          },
        },
      })
      photoMap.set(p.id, created.id)
    }
    process.stdout.write(`\r  foto ${i + 1}/${photos.length}`)
  }
  console.log()

  // 4. Testimoni (cocokkan nama + isi)
  for (const t of await src.testimonial.findMany()) {
    const existing = await dst.testimonial.findFirst({ where: { name: t.name, body: t.body } })
    count('testimoni', !existing)
    if (existing) continue
    const photoUrl = await migrateUrl(t.photoUrl)
    const photoThumb = await migrateUrl(t.photoThumb)
    if (APPLY) {
      await dst.testimonial.create({
        data: { name: t.name, body: t.body, photoUrl, photoThumb, photoBlur: t.photoBlur, photoBytes: t.photoBytes, sortOrder: t.sortOrder, isActive: t.isActive },
      })
    }
  }

  // 5. Worn by (cocokkan nama)
  for (const s of await src.showcase.findMany()) {
    const existing = await dst.showcase.findFirst({ where: { name: s.name } })
    count('worn by', !existing)
    if (existing) continue
    const imageUrl = await migrateUrl(s.imageUrl)
    const thumbnailUrl = await migrateUrl(s.thumbnailUrl)
    if (!imageUrl || !thumbnailUrl) continue
    if (APPLY) {
      await dst.showcase.create({
        data: {
          name: s.name,
          caption: s.caption,
          imageUrl,
          thumbnailUrl,
          blurDataUrl: s.blurDataUrl,
          width: s.width,
          height: s.height,
          sizeBytes: s.sizeBytes,
          photoId: s.photoId ? (photoMap.get(s.photoId) ?? null) : null,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
        },
      })
    }
  }

  // 6. Pengaturan & konten halaman — hanya bila produksi belum mengaturnya
  for (const s of await src.setting.findMany()) {
    const existing = await dst.setting.findUnique({ where: { key: s.key } })
    count('pengaturan', !existing)
    if (!existing && APPLY) await dst.setting.create({ data: { key: s.key, value: s.value } })
  }

  console.log('\nRingkasan (baru / sudah ada):')
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(14)} ${String(v.created).padStart(4)} baru   ${String(v.skipped).padStart(4)} sudah ada`)
  console.log(`  file gambar    ${uploadCount} file, ${(uploadBytes / 1024 / 1024).toFixed(1)} MB ${APPLY ? 'diunggah ke Vercel Blob' : 'akan diunggah'}`)
  if (!APPLY) console.log('\nTidak ada yang diubah. Jalankan lagi dengan --apply untuk menyalin.')
}

main()
  .catch((err) => {
    console.error('\n✗', err.message ?? err)
    process.exitCode = 1
  })
  .finally(async () => {
    await src.$disconnect()
    await dst.$disconnect()
  })
