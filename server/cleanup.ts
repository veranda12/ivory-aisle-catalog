import { prisma } from './db.js'
import { deleteObjects } from './storage.js'

/**
 * Hapus file dari storage hanya bila URL-nya sudah tidak dipakai di tabel mana pun.
 * Satu file bisa dipakai ulang (mis. foto produk dijadikan foto testimoni / "worn by").
 * Panggil SETELAH baris database dihapus/diubah.
 */
export async function deleteUnreferenced(urls: (string | null | undefined)[]) {
  const list = [...new Set(urls.filter((u): u is string => !!u))]
  if (!list.length) return
  const inList = { in: list }
  const [photos, images, chapters, testimonials, showcases] = await Promise.all([
    prisma.photo.findMany({ where: { OR: [{ imageUrl: inList }, { thumbnailUrl: inList }] }, select: { imageUrl: true, thumbnailUrl: true } }),
    prisma.photoImage.findMany({ where: { OR: [{ imageUrl: inList }, { thumbnailUrl: inList }] }, select: { imageUrl: true, thumbnailUrl: true } }),
    prisma.chapter.findMany({ where: { OR: [{ coverUrl: inList }, { coverThumb: inList }] }, select: { coverUrl: true, coverThumb: true } }),
    prisma.testimonial.findMany({ where: { OR: [{ photoUrl: inList }, { photoThumb: inList }] }, select: { photoUrl: true, photoThumb: true } }),
    prisma.showcase.findMany({ where: { OR: [{ imageUrl: inList }, { thumbnailUrl: inList }] }, select: { imageUrl: true, thumbnailUrl: true } }),
  ])
  const used = new Set<string | null>([
    ...photos.flatMap((r) => [r.imageUrl, r.thumbnailUrl]),
    ...images.flatMap((r) => [r.imageUrl, r.thumbnailUrl]),
    ...chapters.flatMap((r) => [r.coverUrl, r.coverThumb]),
    ...testimonials.flatMap((r) => [r.photoUrl, r.photoThumb]),
    ...showcases.flatMap((r) => [r.imageUrl, r.thumbnailUrl]),
  ])
  await deleteObjects(list.filter((u) => !used.has(u)))
}
