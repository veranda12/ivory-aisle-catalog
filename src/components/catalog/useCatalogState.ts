import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export const SORTS = [
  { value: 'newest' },
  { value: 'oldest' },
  { value: 'az' },
  { value: 'price-asc' },
  { value: 'price-desc' },
] as const

/**
 * Semua state katalog disimpan di URL
 * (?f=model.gown,ukuran.m&q=satin&sort=newest&chapter=taman-mawar&look=slug)
 * sehingga hasil filter bisa dibagikan dan tombol "kembali" bekerja sebagaimana mestinya.
 */
export function useCatalogState() {
  const [params, setParams] = useSearchParams()

  const active = useMemo(
    () =>
      (params.get('f') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]+\.[a-z0-9-]+$/.test(s)),
    [params],
  )
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const look = params.get('look')
  const chapter = params.get('chapter') ?? ''

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void, opts: { replace?: boolean; state?: unknown } = { replace: true }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutate(next)
          return next
        },
        { replace: opts.replace, state: opts.state, preventScrollReset: true },
      )
    },
    [setParams],
  )

  const setActive = useCallback(
    (list: string[]) => update((p) => (list.length ? p.set('f', list.join(',')) : p.delete('f'))),
    [update],
  )

  const toggle = useCallback(
    (key: string) => setActive(active.includes(key) ? active.filter((k) => k !== key) : [...active, key]),
    [active, setActive],
  )

  return {
    active,
    q,
    sort,
    look,
    chapter,
    toggle,
    remove: (key: string) => setActive(active.filter((k) => k !== key)),
    clearTags: () => setActive([]),
    clear: () =>
      update((p) => {
        p.delete('f')
        p.delete('q')
        p.delete('chapter')
      }),
    setQ: (value: string) => update((p) => (value ? p.set('q', value) : p.delete('q'))),
    setSort: (value: string) => update((p) => (value && value !== 'newest' ? p.set('sort', value) : p.delete('sort'))),
    setChapter: (value: string) => update((p) => (value ? p.set('chapter', value) : p.delete('chapter'))),
    openLook: (slug: string) => update((p) => p.set('look', slug), { replace: false, state: { lightbox: true } }),
    switchLook: (slug: string) => update((p) => p.set('look', slug), { replace: true, state: { lightbox: true } }),
    closeLook: () => update((p) => p.delete('look')),
    apiParams: {
      q: q || undefined,
      tags: active.length ? active.join(',') : undefined,
      sort: sort !== 'newest' ? sort : undefined,
    },
  }
}
