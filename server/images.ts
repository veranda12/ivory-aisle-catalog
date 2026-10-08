import sharp, { type Metadata, type OutputInfo } from 'sharp'
import { HttpError } from './http.js'
import { putObject } from './storage.js'
import { randomSuffix } from './text.js'

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif', 'gif'])
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|avif|heic|heif|gif)$/

export type ProcessedImage = {
  imageUrl: string
  thumbnailUrl: string
  blurDataUrl: string
  width: number
  height: number
  sizeBytes: number
  storageKey: string
}

/**
 * Validasi isi file (bukan hanya ekstensi/mime), lalu buat:
 *  - full  : maks 2000px, WebP  → untuk tampilan detail
 *  - thumb : 720px, WebP        → untuk grid katalog
 *  - blur  : 16px, base64       → placeholder saat memuat
 */
export async function processAndStore(
  file: { buffer: Buffer; mimetype: string },
  baseName: string,
): Promise<ProcessedImage> {
  if (!ALLOWED_MIME.test(file.mimetype)) {
    throw new HttpError(415, 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau AVIF.')
  }

  let meta: Metadata
  try {
    meta = await sharp(file.buffer).metadata()
  } catch {
    throw new HttpError(415, 'File ini bukan gambar yang valid.')
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new HttpError(415, 'Format gambar tidak didukung.')
  }
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) {
    throw new HttpError(422, 'Resolusi foto terlalu kecil (minimal 200px).')
  }

  // rotate() tanpa argumen = ikuti orientasi EXIF; metadata EXIF (termasuk GPS) dibuang.
  const base = sharp(file.buffer, { failOn: 'error' }).rotate()

  let full: { data: Buffer; info: OutputInfo }
  let thumb: Buffer
  let blur: Buffer
  try {
    full = await base
      .clone()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    thumb = await base.clone().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer()
    blur = await base.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer()
  } catch {
    throw new HttpError(422, 'Foto tidak bisa diproses. Coba ekspor ulang sebagai JPG.')
  }

  const key = `photos/${baseName.slice(0, 40) || 'look'}-${Date.now().toString(36)}${randomSuffix(4)}`
  const [imageUrl, thumbnailUrl] = await Promise.all([
    putObject(`${key}/full.webp`, full.data, 'image/webp'),
    putObject(`${key}/thumb.webp`, thumb, 'image/webp'),
  ])

  return {
    imageUrl,
    thumbnailUrl,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    width: full.info.width,
    height: full.info.height,
    sizeBytes: full.data.length + thumb.length,
    storageKey: key,
  }
}
