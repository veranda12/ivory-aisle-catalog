import { z } from 'zod'

// Hapus karakter kontrol & rapikan spasi agar metadata aman disimpan.
export function clean(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim()
}

export const cleanStr = (max: number) => z.string().max(max * 2).transform(clean).pipe(z.string().max(max))

export const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null ? v : clean(v) || null))
    .pipe(z.string().max(max).nullable().optional())

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function randomSuffix(len = 5): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
