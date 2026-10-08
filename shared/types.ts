// Tipe data yang dipakai bersama oleh API (server/) dan UI (src/).
import type { SiteContent } from './content.js'

export type ProductKind = 'GOWN' | 'ADDON'

export type TagDTO = {
  id: string
  name: string
  slug: string
  categoryId: string
  categorySlug: string
  categoryName: string
}

export type ChapterRef = { id: string; name: string; slug: string; numeral: string | null }

export type GalleryImage = {
  id: string
  imageUrl: string
  thumbnailUrl: string
  blurDataUrl: string | null
  width: number
  height: number
}

export type PhotoDTO = {
  id: string
  kind: ProductKind
  title: string
  slug: string
  description: string | null
  chapter: ChapterRef | null
  price: number | null
  deposit: number | null
  bust: string | null
  waist: string | null
  length: string | null
  imageUrl: string
  thumbnailUrl: string
  blurDataUrl: string | null
  width: number
  height: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  tags: TagDTO[]
  images: GalleryImage[]
}

export type AdminPhotoDTO = PhotoDTO & { sizeBytes: number }

export type PhotoPage<T = PhotoDTO> = {
  items: T[]
  total: number
  nextOffset: number | null
}

export type FilterTag = { id: string; name: string; slug: string; count: number }

export type FilterCategory = {
  id: string
  name: string
  slug: string
  tags: FilterTag[]
}

export type ChapterDTO = {
  id: string
  name: string
  slug: string
  numeral: string | null
  description: string | null
  coverUrl: string | null
  coverThumb: string | null
  coverBlur: string | null
  /** true = chapter belum punya sampul; memakai foto terbaru di dalamnya. */
  coverIsFallback: boolean
  sortOrder: number
  showInNav: boolean
  isActive: boolean
  photoCount: number
}

export type TestimonialDTO = {
  id: string
  name: string
  body: string
  photoUrl: string | null
  photoThumb: string | null
  photoBlur: string | null
  sortOrder: number
  isActive: boolean
}

export type ShowcaseDTO = {
  id: string
  name: string
  caption: string | null
  imageUrl: string
  thumbnailUrl: string
  blurDataUrl: string | null
  width: number
  height: number
  photo: { id: string; slug: string; title: string } | null
  sortOrder: number
  isActive: boolean
}

export type SiteSettings = {
  brandName: string
  tagline: string
  heroLine1: string
  heroLine2: string
  heroNote: string
  whatsapp: string
  instagram: string
  city: string
  rentalDays: string
}

export type SiteInfo = {
  settings: SiteSettings
  content: SiteContent
  totalLooks: number
  heroPhotos: PhotoDTO[]
  navChapters: ChapterRef[]
  hasAddons: boolean
}

export type HomeData = {
  chapters: ChapterDTO[]
  showcases: ShowcaseDTO[]
  testimonials: TestimonialDTO[]
}

export type AdminTag = {
  id: string
  name: string
  slug: string
  isActive: boolean
  sortOrder: number
  photoCount: number
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  sortOrder: number
  tags: AdminTag[]
}

export type AdminStats = {
  totalPhotos: number
  activePhotos: number
  totalAddons: number
  totalTags: number
  totalCategories: number
  totalChapters: number
  untaggedCount: number
  addedThisWeek: number
  storageBytes: number
  recent: AdminPhotoDTO[]
  untagged: AdminPhotoDTO[]
  topTags: { id: string; name: string; categoryName: string; count: number }[]
}

export type SessionUser = { id: string; email: string; name: string | null; role: 'ADMIN' | 'EDITOR' }

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: 'Maison Lila',
  tagline: 'Sewa gaun untuk momen yang ingin kamu kenang',
  heroLine1: 'Temukan gaun',
  heroLine2: 'yang terasa seperti kamu.',
  heroNote: 'Gaun vintage & modern pilihan, disewa untuk tiga hari. Pilih, tanyakan tanggalnya, lalu kami antar.',
  whatsapp: '',
  instagram: '',
  city: 'Jakarta',
  rentalDays: '3',
}
