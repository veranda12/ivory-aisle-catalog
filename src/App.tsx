import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { PublicLayout } from '@/components/PublicLayout'
import { HomePage } from '@/pages/HomePage'
import { CatalogPage } from '@/pages/CatalogPage'
import { LookPage } from '@/pages/LookPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AboutPage, AddOnPage, ChapterPage, ChaptersPage, FittingPage, HowToRentPage } from '@/pages/InfoPages'

// Panel admin dimuat terpisah agar pengunjung katalog tidak mengunduh kodenya.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const PhotosPage = lazy(() => import('@/pages/admin/PhotosPage'))
const UploadPage = lazy(() => import('@/pages/admin/UploadPage'))
const EditPhotoPage = lazy(() => import('@/pages/admin/EditPhotoPage'))
const TagsPage = lazy(() => import('@/pages/admin/TagsPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const ChaptersAdminPage = lazy(() => import('@/pages/admin/ChaptersAdminPage'))
const ContentAdminPage = lazy(() => import('@/pages/admin/ContentAdminPage'))
const MorePage = lazy(() => import('@/pages/admin/MorePage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AdminFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="display animate-pulse text-2xl italic text-muted">Memuat…</span>
    </div>
  )
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="catalog/:slug" element={<LookPage />} />
            <Route path="chapters" element={<ChaptersPage />} />
            <Route path="chapters/:slug" element={<ChapterPage />} />
            <Route path="add-on" element={<AddOnPage />} />
            <Route path="cara-sewa" element={<HowToRentPage />} />
            <Route path="fitting-online" element={<FittingPage />} />
            <Route path="tentang-kami" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="admin/login" element={<LoginPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="photos/new" element={<UploadPage />} />
            <Route path="photos/:id" element={<EditPhotoPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="chapters" element={<ChaptersAdminPage />} />
            <Route path="content" element={<ContentAdminPage />} />
            <Route path="more" element={<MorePage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
