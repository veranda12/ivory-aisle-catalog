import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { ToastProvider } from '@/components/ui/Toast'
import { LangProvider } from '@/lib/i18n'
import { App } from './App'
import './index.css'

// Sesi kedaluwarsa → kosongkan data "me" sehingga AdminLayout mengarahkan ke halaman login.
const onAuthError = (err: unknown) => {
  if ((err as { status?: number }).status === 401) queryClient.setQueryData(['me'], null)
}

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onAuthError }),
  mutationCache: new MutationCache({ onError: onAuthError }),
  defaultOptions: {
    queries: {
      retry: (count, err) => count < 2 && !(err as { status?: number }).status?.toString().startsWith('4'),
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" → animasi transform dimatikan bila pengguna memilih "kurangi gerakan". */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <LangProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </LangProvider>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
