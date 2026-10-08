import { useMemo } from 'react'
import { useSite } from './queries'
import { useLang } from './i18n'
import { DEFAULT_SETTINGS } from '@shared/types'
import { DEFAULT_CONTENT, localize } from '@shared/content'

/** Pengaturan + konten halaman dalam bahasa aktif (dengan cadangan bawaan saat memuat). */
export function useSiteData() {
  const { data, isPending } = useSite()
  const { lang } = useLang()
  const content = useMemo(() => localize(data?.content ?? DEFAULT_CONTENT, lang), [data?.content, lang])
  return {
    site: data,
    settings: data?.settings ?? DEFAULT_SETTINGS,
    content,
    navChapters: data?.navChapters ?? [],
    hasAddons: data?.hasAddons ?? false,
    isPending,
  }
}

export function waLink(number: string, text?: string) {
  const n = number.replace(/[^\d]/g, '').replace(/^0/, '62')
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export const addDays = (iso: string, days: number) => {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDay(iso: string, lang: 'id' | 'en') {
  return toDate(iso).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
}

/** Tanggal acara yang terakhir dipilih pengunjung (Panduan Periode / halaman produk). */
const EVENT_KEY = 'catalog-event-date'
export const loadEventDate = () => {
  try {
    const v = localStorage.getItem(EVENT_KEY) ?? ''
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= new Date().toISOString().slice(0, 10) ? v : ''
  } catch {
    return ''
  }
}
export const saveEventDate = (v: string) => {
  try {
    if (v) localStorage.setItem(EVENT_KEY, v)
    else localStorage.removeItem(EVENT_KEY)
  } catch {
    /* abaikan */
  }
}
