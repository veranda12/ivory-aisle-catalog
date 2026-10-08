import { prisma } from './db.js'
import { DEFAULT_SETTINGS, type SiteSettings } from '../shared/types.js'
import { DEFAULT_CONTENT, type SiteContent } from '../shared/content.js'

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]
const CONTENT_KEY = 'content'

export async function getSettings(): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } })
  const settings = { ...DEFAULT_SETTINGS }
  for (const row of rows) settings[row.key as keyof SiteSettings] = row.value
  return settings
}

export async function saveSettings(values: Partial<SiteSettings>) {
  const entries = Object.entries(values).filter(([k, v]) => KEYS.includes(k as keyof SiteSettings) && v != null)
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }),
    ),
  )
  return getSettings()
}

/** Konten halaman; field yang belum pernah disimpan memakai teks bawaan. */
export async function getContent(): Promise<SiteContent> {
  const row = await prisma.setting.findUnique({ where: { key: CONTENT_KEY } })
  if (!row) return DEFAULT_CONTENT
  try {
    const saved = JSON.parse(row.value) as Partial<SiteContent>
    return {
      id: { ...DEFAULT_CONTENT.id, ...saved.id },
      en: { ...DEFAULT_CONTENT.en, ...saved.en },
    }
  } catch {
    return DEFAULT_CONTENT
  }
}

export async function saveContent(content: SiteContent) {
  const value = JSON.stringify(content)
  await prisma.setting.upsert({ where: { key: CONTENT_KEY }, create: { key: CONTENT_KEY, value }, update: { value } })
  return getContent()
}
