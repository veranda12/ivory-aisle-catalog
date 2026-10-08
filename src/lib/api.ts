export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown }

export async function api<T>(path: string, { body, headers, ...init }: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        Accept: 'application/json',
        'x-catalog-request': '1',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Koneksi bermasalah. Periksa internet lalu coba lagi.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Terjadi kesalahan. Coba lagi.')
  return data as T
}

/** Upload multipart dengan progress (fetch belum mendukung progress upload). */
export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  {
    method = 'POST',
    onProgress,
    signal,
  }: { method?: string; onProgress?: (ratio: number) => void; signal?: AbortSignal } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `/api${path}`)
    xhr.setRequestHeader('x-catalog-request', '1')
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T)
      else
        reject(
          new ApiError(
            xhr.status,
            xhr.status === 413 ? 'Ukuran file terlalu besar.' : (xhr.response?.error ?? 'Upload gagal. Coba lagi.'),
          ),
        )
    }
    xhr.onerror = () => reject(new ApiError(0, 'Koneksi terputus saat upload.'))
    xhr.onabort = () => reject(new ApiError(0, 'Upload dibatalkan.'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v))
  const str = s.toString()
  return str ? `?${str}` : ''
}
