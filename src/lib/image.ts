// Mengecilkan foto di browser sebelum upload.
// Foto kamera HP bisa 5–12MB; Vercel membatasi body request ±4.5MB.
// Server tetap memproses ulang (sharp) — ini untuk menghemat kuota & waktu upload.

const MAX_EDGE = 2400
const TARGET_BYTES = 3.6 * 1024 * 1024
const HARD_LIMIT = 4.3 * 1024 * 1024

export async function prepareForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('File ini bukan foto.')
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bitmap = null
  }

  if (!bitmap) {
    // Browser tidak bisa membaca formatnya (mis. HEIC di Chrome) — kirim apa adanya bila muat.
    if (file.size <= HARD_LIMIT) return file
    throw new Error('Format foto tidak bisa dibaca. Ubah ke JPG terlebih dahulu.')
  }

  const longEdge = Math.max(bitmap.width, bitmap.height)
  if (file.size <= TARGET_BYTES && longEdge <= MAX_EDGE && /image\/(jpeg|webp|png)/.test(file.type)) {
    bitmap.close()
    return file
  }

  const scale = Math.min(1, MAX_EDGE / longEdge)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const quality of [0.9, 0.82, 0.72]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob) continue
    if (blob.size <= TARGET_BYTES || (quality === 0.72 && blob.size <= HARD_LIMIT)) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
    }
  }
  throw new Error('Foto terlalu besar setelah dikompres.')
}
