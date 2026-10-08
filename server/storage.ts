import { put, del } from '@vercel/blob'
import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { HttpError } from './http.js'

// Dua driver:
//  - Vercel Blob   → dipakai otomatis di produksi. Autentikasi diurus @vercel/blob:
//                    BLOB_STORE_ID + token OIDC Vercel (cara baru), atau BLOB_READ_WRITE_TOKEN (cara lama).
//  - Folder lokal  → ./uploads, disajikan Express di /uploads (development).
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

const useBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)

export function storageDriver(): 'vercel-blob' | 'local' {
  return useBlob() ? 'vercel-blob' : 'local'
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (useBlob()) {
    const blob = await put(key, body, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    return blob.url
  }
  if (process.env.VERCEL) {
    throw new HttpError(500, 'Storage belum dikonfigurasi. Hubungkan Vercel Blob ke project (Storage → Blob).')
  }
  const file = path.join(LOCAL_UPLOAD_DIR, key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
  return `/uploads/${key}`
}

export async function deleteObjects(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => !!u)
  if (!list.length) return
  const remote = list.filter((u) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(u))
  const local = list.filter((u) => u.startsWith('/uploads/'))
  try {
    if (remote.length && useBlob()) await del(remote)
    for (const u of local) {
      const file = path.join(LOCAL_UPLOAD_DIR, u.slice('/uploads/'.length))
      if (!file.startsWith(LOCAL_UPLOAD_DIR)) continue
      await unlink(file).catch(() => {})
      await rmdir(path.dirname(file)).catch(() => {}) // hanya terhapus bila folder sudah kosong
    }
  } catch (err) {
    // Gagal menghapus file tidak boleh menggagalkan penghapusan data.
    console.warn('Gagal menghapus file storage:', err)
  }
}
