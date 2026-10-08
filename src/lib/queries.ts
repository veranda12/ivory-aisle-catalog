import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, qs } from './api'
import type {
  AdminCategory,
  AdminPhotoDTO,
  AdminStats,
  ChapterDTO,
  FilterCategory,
  HomeData,
  PhotoDTO,
  PhotoPage,
  SessionUser,
  ShowcaseDTO,
  SiteInfo,
  SiteSettings,
  TestimonialDTO,
} from '@shared/types'
import type { SiteContent } from '@shared/content'

export const keys = {
  site: ['site'] as const,
  home: ['home'] as const,
  chapters: ['chapters'] as const,
  chapter: (slug: string) => ['chapters', slug] as const,
  filters: (kind: string) => ['filters', kind] as const,
  catalog: (p: CatalogParams) => ['catalog', p] as const,
  photo: (slug: string) => ['photo', slug] as const,
  me: ['me'] as const,
  stats: ['admin', 'stats'] as const,
  adminPhotos: (p: object) => ['admin', 'photos', p] as const,
  adminPhoto: (id: string) => ['admin', 'photo', id] as const,
  tags: ['admin', 'tags'] as const,
  adminChapters: ['admin', 'chapters'] as const,
  testimonials: ['admin', 'testimonials'] as const,
  showcases: ['admin', 'showcases'] as const,
  content: ['admin', 'content'] as const,
  settings: ['admin', 'settings'] as const,
}

export type CatalogParams = {
  q?: string
  tags?: string
  sort?: string
  chapter?: string
  kind?: 'gown' | 'addon'
  exclude?: string
}

export const useSite = () => useQuery({ queryKey: keys.site, queryFn: () => api<SiteInfo>('/site'), staleTime: 60_000 })
export const useHome = () => useQuery({ queryKey: keys.home, queryFn: () => api<HomeData>('/home'), staleTime: 60_000 })
export const useChapters = () =>
  useQuery({ queryKey: keys.chapters, queryFn: () => api<ChapterDTO[]>('/chapters'), staleTime: 60_000 })
export const useChapter = (slug: string) =>
  useQuery({
    queryKey: keys.chapter(slug),
    queryFn: () => api<ChapterDTO>(`/chapters/${encodeURIComponent(slug)}`),
    enabled: !!slug,
    staleTime: 60_000,
  })

export const useFilters = (kind: 'gown' | 'addon' = 'gown') =>
  useQuery({
    queryKey: keys.filters(kind),
    queryFn: () => api<FilterCategory[]>(`/catalog/filters?kind=${kind}`),
    staleTime: 60_000,
  })

export const PAGE_SIZE = 24

export const useCatalog = (params: CatalogParams, opts: { limit?: number; enabled?: boolean } = {}) =>
  useInfiniteQuery({
    queryKey: [...keys.catalog(params), opts.limit ?? PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      api<PhotoPage>(`/catalog/photos${qs({ ...params, offset: pageParam, limit: opts.limit ?? PAGE_SIZE })}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
  })

export const usePhoto = (slug: string, initial?: PhotoDTO) =>
  useQuery({
    queryKey: keys.photo(slug),
    queryFn: () => api<PhotoDTO>(`/catalog/photos/${encodeURIComponent(slug)}`),
    initialData: initial,
    enabled: !!slug,
    staleTime: 60_000,
  })

// ───────── Admin ─────────

export const useMe = () =>
  useQuery({
    queryKey: keys.me,
    queryFn: () => api<SessionUser>('/auth/me').catch(() => null),
    staleTime: 5 * 60_000,
  })

export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: () => api<AdminStats>('/admin/stats') })

export type AdminPhotoParams = { q?: string; tag?: string; status?: string; sort?: string; kind?: string; chapter?: string }

export const useAdminPhotos = (params: AdminPhotoParams) =>
  useInfiniteQuery({
    queryKey: keys.adminPhotos(params),
    queryFn: ({ pageParam }) =>
      api<PhotoPage<AdminPhotoDTO>>(`/admin/photos${qs({ ...params, offset: pageParam, limit: 40 })}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    placeholderData: keepPreviousData,
  })

export const useAdminPhoto = (id: string) =>
  useQuery({ queryKey: keys.adminPhoto(id), queryFn: () => api<AdminPhotoDTO>(`/admin/photos/${id}`) })

export const useTags = () => useQuery({ queryKey: keys.tags, queryFn: () => api<AdminCategory[]>('/admin/tags') })
export const useAdminChapters = () =>
  useQuery({ queryKey: keys.adminChapters, queryFn: () => api<ChapterDTO[]>('/admin/chapters') })
export const useTestimonials = () =>
  useQuery({ queryKey: keys.testimonials, queryFn: () => api<TestimonialDTO[]>('/admin/testimonials') })
export const useShowcases = () => useQuery({ queryKey: keys.showcases, queryFn: () => api<ShowcaseDTO[]>('/admin/showcases') })
export const useContent = () => useQuery({ queryKey: keys.content, queryFn: () => api<SiteContent>('/admin/content') })

export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: () => api<{ settings: SiteSettings; storageDriver: string }>('/admin/settings'),
  })
