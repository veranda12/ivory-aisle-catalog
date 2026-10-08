// Seed DEMO — hanya untuk mencoba tampilan. Semua isi demo ditandai jelas sebagai contoh.
//   npm run db:seed:demo            → ±40 foto gaun dari Wikimedia Commons + chapter, ukuran, deposit
//   npm run db:seed:demo -- extras  → add-on demo, contoh testimoni & "worn by", chapter demo
// Hapus lewat admin sebelum dipakai sungguhan.
import { prisma } from '../server/db.js'
import { processAndStore } from '../server/images.js'
import { uniquePhotoSlug } from '../server/photos.js'

const arg = process.argv[2] ?? '40'
const UA = 'catalog-sample-demo-seed/1.0 (local development)'

const GOWN_QUERIES = [
  'evening gown model',
  'ball gown fashion show',
  'wedding gown runway',
  'haute couture gown',
  'kebaya fashion',
  'hijab fashion show',
  'fashion week dress runway',
  'bridal fashion show',
]
const ADDON_QUERIES = ['lace parasol', 'bridal veil', 'hand fan lace', 'opera gloves', 'tiara jewelry', 'bonnet hat']

const NAMES = [
  'Aruna', 'Kirana', 'Sekar', 'Laras', 'Ayudia', 'Nayla', 'Calla', 'Seruni', 'Melati', 'Anindya',
  'Rinjani', 'Aurel', 'Kemala', 'Gendhis', 'Swastika', 'Liora', 'Ambar', 'Sinta', 'Mahika', 'Tiara',
]
const ADDON_NAMES = ['Payung Renda Gading', 'Kerudung Tulle Lembut', 'Kipas Renda Mawar', 'Sarung Tangan Satin', 'Mahkota Mutiara', 'Topi Bonnet Krem', 'Payung Mutiara Perak', 'Veil Panjang Ivory']

type WikiPage = { title: string; imageinfo?: { thumburl?: string; width: number; height: number; mime: string }[] }

async function findImages(queries: string[], target: number, portraitOnly: boolean) {
  const found = new Map<string, string>()
  for (const q of queries) {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: `${q} filetype:bitmap`,
      gsrlimit: '30',
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: '1400',
    }).toString()
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    const data = (await res.json()) as { query?: { pages: Record<string, WikiPage> } }
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]
      if (!info?.thumburl || info.mime !== 'image/jpeg' || info.width < 600) continue
      const ratio = info.height / info.width
      if (portraitOnly && (ratio < 1.2 || ratio > 2.2)) continue
      found.set(page.title, info.thumburl)
    }
    if (found.size >= target * 1.5) break
  }
  return [...found].map(([title, url]) => ({ title, url }))
}

const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function download(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if (res.status === 429) await sleep(2500 * (attempt + 1))
    else throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('HTTP 429')
}

const MEASURES = [
  { bust: '80–88 cm', waist: '64–70 cm', length: '140 cm' },
  { bust: '84–92 cm', waist: '68–76 cm', length: '150+ cm' },
  { bust: '86–94 cm', waist: '72–80 cm', length: '150+ cm' },
  { bust: '90–100 cm', waist: '76–86 cm', length: '155 cm' },
]

async function seedGowns(target: number) {
  const categories = await prisma.tagCategory.findMany({ include: { tags: true } })
  if (!categories.length) throw new Error('Jalankan `npm run db:seed` terlebih dahulu.')
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c.tags]))
  const chapters = await prisma.chapter.findMany({ where: { showInNav: false } })

  console.log('Mencari foto gaun di Wikimedia Commons…')
  const images = pick(await findImages(GOWN_QUERIES, target, true), target)
  let done = 0
  for (const [i, img] of images.entries()) {
    try {
      const buffer = await download(img.url)
      const title = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ''}`
      const slug = await uniquePhotoSlug(title)
      const image = await processAndStore({ buffer, mimetype: 'image/jpeg' }, slug)
      const tagIds = [
        ...pick(bySlug['model'] ?? [], 1),
        ...pick(bySlug['ukuran'] ?? [], 1 + Math.floor(Math.random() * 3)),
        ...pick(bySlug['gaya'] ?? [], 1 + Math.floor(Math.random() * 2)),
        ...pick(bySlug['warna'] ?? [], 1),
        ...pick(bySlug['bahan'] ?? [], 1),
        ...pick(bySlug['acara'] ?? [], Math.floor(Math.random() * 3)),
        ...pick(bySlug['panjang-dress'] ?? [], 1),
      ].map((t) => t.id)
      await prisma.photo.create({
        data: {
          title,
          slug,
          chapterId: chapters.length ? chapters[i % chapters.length]!.id : null,
          price: (6 + Math.floor(Math.random() * 12)) * 50_000,
          deposit: 200_000,
          ...MEASURES[i % MEASURES.length],
          description: `Foto demo dari Wikimedia Commons (${img.title.replace(/^File:/, '')}). Ganti dengan foto koleksi asli.`,
          ...image,
          createdAt: new Date(Date.now() - i * 36e5 * 7),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      })
      done++
      process.stdout.write(`\r  ${done}/${images.length}`)
    } catch (err) {
      console.warn(`\n  Lewati ${img.title}: ${(err as Error).message}`)
    }
  }
  console.log(`\n✓ ${done} foto gaun demo ditambahkan.`)
}

async function seedExtras() {
  // 1. Lengkapi produk lama yang belum punya ukuran / deposit, dan tandai beberapa sebagai unggulan.
  const gowns = await prisma.photo.findMany({ where: { kind: 'GOWN' }, orderBy: { createdAt: 'desc' } })
  for (const [i, g] of gowns.entries()) {
    await prisma.photo.update({
      where: { id: g.id },
      data: {
        deposit: g.deposit ?? 200_000,
        bust: g.bust ?? MEASURES[i % MEASURES.length]!.bust,
        waist: g.waist ?? MEASURES[i % MEASURES.length]!.waist,
        length: g.length ?? MEASURES[i % MEASURES.length]!.length,
        isFeatured: i < 5,
      },
    })
  }

  const lengthTags = await prisma.tag.findMany({ where: { category: { slug: 'panjang-dress' } } })
  if (lengthTags.length) {
    await prisma.photoTag.createMany({
      data: gowns.map((g, i) => ({ photoId: g.id, tagId: lengthTags[i % lengthTags.length]!.id })),
      skipDuplicates: true,
    })
  }

  // 2. Chapter demo: beri nomor & deskripsi pada chapter lama, tambah chapter korset di menu.
  const chapters = await prisma.chapter.findMany({ orderBy: { sortOrder: 'asc' } })
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
  const blurbs = [
    'Siluet anggun dengan sentuhan kerajaan — renda, korset, dan rok yang mengembang lembut.',
    'Motif bunga, warna pastel, dan kain ringan untuk pesta siang yang romantis.',
    'Gaun malam yang dramatis — satin berkilau, warna gelap, dan potongan yang berani.',
    'Untuk akad dan resepsi: putih gading, brokat halus, dan detail yang sopan.',
  ]
  for (const [i, c] of chapters.entries()) {
    await prisma.chapter.update({
      where: { id: c.id },
      data: { numeral: c.numeral ?? numerals[i], description: c.description ?? blurbs[i % blurbs.length] },
    })
  }
  if (!(await prisma.chapter.findFirst({ where: { showInNav: true } }))) {
    const korset = await prisma.chapter.create({
      data: {
        name: 'Korset & Siluet',
        slug: 'korset-siluet',
        numeral: numerals[chapters.length] ?? null,
        description: 'Koleksi korset dan atasan berstruktur untuk dipadukan sesuai gayamu.',
        sortOrder: chapters.length,
        showInNav: true,
      },
    })
    const some = gowns.filter((_, i) => i % 6 === 0).map((g) => g.id)
    await prisma.photo.updateMany({ where: { id: { in: some } }, data: { chapterId: korset.id } })
  }

  // 3. Add-on demo
  if ((await prisma.photo.count({ where: { kind: 'ADDON' } })) === 0) {
    console.log('Mencari foto aksesori…')
    const imgs = pick(await findImages(ADDON_QUERIES, ADDON_NAMES.length, false), ADDON_NAMES.length)
    for (const [i, img] of imgs.entries()) {
      try {
        const buffer = await download(img.url)
        const title = ADDON_NAMES[i]!
        const slug = await uniquePhotoSlug(title)
        const image = await processAndStore({ buffer, mimetype: 'image/jpeg' }, slug)
        await prisma.photo.create({
          data: {
            kind: 'ADDON',
            title,
            slug,
            price: (3 + (i % 5)) * 5_000,
            description: `Add-on demo dari Wikimedia Commons (${img.title.replace(/^File:/, '')}).`,
            ...image,
          },
        })
        process.stdout.write('.')
      } catch (err) {
        console.warn(`\n  Lewati ${img.title}: ${(err as Error).message}`)
      }
    }
    console.log('\n✓ Add-on demo ditambahkan.')
  }

  // 4. Contoh testimoni — teks jelas ditandai sebagai contoh.
  if ((await prisma.testimonial.count()) === 0) {
    const samples = [
      'Contoh testimoni: gaunnya pas sekali dan wangi. Ganti teks ini dengan ulasan asli dari pelanggan.',
      'Contoh testimoni: admin sabar membantu memilih ukuran. Ganti dengan ulasan asli.',
      'Contoh testimoni: datang tepat waktu dan kondisinya rapi. Ganti dengan ulasan asli.',
      'Contoh testimoni: banyak yang memuji di acara. Ganti dengan ulasan asli.',
    ]
    const withPhotos = gowns.slice(5, 9)
    for (const [i, body] of samples.entries()) {
      const p = withPhotos[i]
      await prisma.testimonial.create({
        data: {
          name: `Pelanggan ${i + 1}`,
          body,
          sortOrder: i,
          photoUrl: i % 2 === 0 ? (p?.imageUrl ?? null) : null,
          photoThumb: i % 2 === 0 ? (p?.thumbnailUrl ?? null) : null,
          photoBlur: i % 2 === 0 ? (p?.blurDataUrl ?? null) : null,
        },
      })
    }
    console.log('✓ Contoh testimoni ditambahkan.')
  }

  // 5. Contoh "worn by" — memakai foto demo yang sama, ditautkan ke produknya.
  if ((await prisma.showcase.count()) === 0) {
    for (const [i, g] of gowns.slice(9, 12).entries()) {
      await prisma.showcase.create({
        data: {
          name: `Contoh Klien ${i + 1}`,
          caption: 'Ganti dengan foto klien asli',
          imageUrl: g.imageUrl,
          thumbnailUrl: g.thumbnailUrl,
          blurDataUrl: g.blurDataUrl,
          width: g.width,
          height: g.height,
          photoId: g.id,
          sortOrder: i,
        },
      })
    }
    console.log('✓ Contoh "worn by" ditambahkan.')
  }
  console.log("✓ Data demo tambahan selesai.")
}

async function main() {
  if (arg === 'extras') await seedExtras()
  else await seedGowns(Number(arg) || 40)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
