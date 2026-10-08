export const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

export function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET belum di-set atau kurang dari 32 karakter.')
  }
  return new TextEncoder().encode(secret)
}

export const siteUrl = () => (process.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

// Batas di server. Vercel sendiri membatasi body request ±4.5MB,
// karena itu klien mengecilkan foto sebelum upload (lihat src/lib/image.ts).
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
