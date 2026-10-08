import { useEffect, useState, useSyncExternalStore } from 'react'

export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Jumlah kolom masonry menurut lebar layar. */
export function useColumnCount(): number {
  const md = useMediaQuery('(min-width: 768px)')
  const xl = useMediaQuery('(min-width: 1280px)')
  const xxl = useMediaQuery('(min-width: 1680px)')
  return xxl ? 5 : xl ? 4 : md ? 3 : 2
}

export function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [locked])
}

type Meta = { title?: string; description?: string; image?: string; noindex?: boolean }

function setMeta(attr: 'name' | 'property', key: string, value: string | undefined) {
  if (!value) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

/** Mengatur <title>, description, OpenGraph & Twitter card per halaman. */
export function useDocumentMeta({ title, description, image, noindex }: Meta) {
  useEffect(() => {
    if (title) document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', window.location.href)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    if (image) {
      const abs = new URL(image, window.location.origin).href
      setMeta('property', 'og:image', abs)
      setMeta('name', 'twitter:image', abs)
    }
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  }, [title, description, image, noindex])
}
