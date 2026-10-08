// Seed dasar: akun admin pertama + kategori & tag awal.
// Aman dijalankan berulang (upsert) — dijalankan otomatis setiap build di Vercel.
// Password admin yang sudah ada TIDAK pernah ditimpa. Jalankan manual: npm run db:seed
import bcrypt from 'bcryptjs'
import { prisma } from '../server/db.js'
import { slugify } from '../server/text.js'

const CATEGORIES: { name: string; tags: string[] }[] = [
  { name: 'Model', tags: ['Gown', 'A-Line', 'Mermaid', 'Ball Gown', 'Kebaya', 'Kaftan'] },
  { name: 'Ukuran', tags: ['XS', 'S', 'M', 'L', 'XL', 'All Size'] },
  { name: 'Gaya', tags: ['Hijab Friendly', 'Formal', 'Elegan', 'Minimalis', 'Modern'] },
  { name: 'Warna', tags: ['Burgundy', 'Sage', 'Dusty Pink', 'Navy', 'Lavender', 'Champagne', 'Hitam'] },
  { name: 'Bahan', tags: ['Satin', 'Tulle', 'Brokat', 'Chiffon', 'Sifon Ceruti'] },
  { name: 'Acara', tags: ['Wisuda', 'Lamaran', 'Pesta Malam', 'Bridesmaid', 'Akad'] },
  { name: 'Panjang Dress', tags: ['Mini', 'Midi', 'Maxi', 'Menyapu Lantai'] },
  { name: 'Tambahan', tags: ['Bisa Fitting Online', 'Termasuk Petticoat', 'Bisa Diatur (Lace-up)'] },
]

// Chapter awal — hanya dibuat bila belum ada chapter sama sekali.
const CHAPTERS = [
  { numeral: 'I', name: 'Istana Senja', description: 'Siluet anggun dengan sentuhan kerajaan — renda, korset, dan rok yang mengembang lembut.' },
  { numeral: 'II', name: 'Taman Mawar', description: 'Motif bunga, warna pastel, dan kain ringan untuk pesta siang yang romantis.' },
  { numeral: 'III', name: 'Malam Berbintang', description: 'Gaun malam yang dramatis — satin berkilau, warna gelap, dan potongan yang berani.' },
  { numeral: 'IV', name: 'Korset & Siluet', description: 'Koleksi korset dan atasan berstruktur untuk dipadukan sesuai gayamu.', showInNav: true },
]

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD ?? ''
  const existing = email ? await prisma.user.findUnique({ where: { email } }) : null
  if (!email || password.length < 8) {
    console.warn('! ADMIN_EMAIL / ADMIN_PASSWORD (min. 8 karakter) belum di-set — akun admin tidak dibuat.')
  } else if (existing) {
    console.log(`• Admin ${email} sudah ada — password tidak diubah.`)
  } else {
    await prisma.user.create({
      data: { email, name: process.env.ADMIN_NAME || 'Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) },
    })
    console.log(`✓ Admin dibuat: ${email}`)
  }

  for (const [ci, cat] of CATEGORIES.entries()) {
    const slug = slugify(cat.name)
    const category = await prisma.tagCategory.upsert({
      where: { slug },
      create: { name: cat.name, slug, sortOrder: ci },
      update: {},
    })
    for (const [ti, name] of cat.tags.entries()) {
      const tagSlug = slugify(name)
      await prisma.tag.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: tagSlug } },
        create: { name, slug: tagSlug, categoryId: category.id, sortOrder: ti },
        update: {},
      })
    }
  }
  console.log(`✓ ${CATEGORIES.length} kategori tag siap.`)

  if ((await prisma.chapter.count()) === 0) {
    for (const [i, c] of CHAPTERS.entries()) {
      await prisma.chapter.create({ data: { ...c, slug: slugify(c.name), sortOrder: i } })
    }
    console.log(`✓ ${CHAPTERS.length} chapter awal dibuat.`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
