import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys, useMe, useSite } from '@/lib/queries'
import { useDocumentMeta } from '@/lib/hooks'
import { Wordmark } from '@/components/PublicLayout'
import { Img } from '@/components/ui/Img'
import type { SessionUser } from '@shared/types'

export default function LoginPage() {
  const { data: me } = useMe()
  const { data: site } = useSite()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useDocumentMeta({ title: 'Masuk · Admin', noindex: true })

  const next = params.get('next')?.startsWith('/admin') ? params.get('next')! : '/admin'
  if (me) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await api<SessionUser>('/auth/login', { method: 'POST', body: { email, password } })
      qc.setQueryData(keys.me, user)
      navigate(next, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const photo = site?.heroPhotos[1] ?? site?.heroPhotos[0]

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        {photo ? (
          <Img src={photo.imageUrl} blur={photo.blurDataUrl} alt="" intrinsic={false} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-lavender via-blush to-mauve/50" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-plum/60 via-transparent" />
        <p className="display absolute bottom-12 left-12 max-w-md text-[3rem] leading-none text-paper italic">
          Atur koleksimu, dari mana saja.
        </p>
      </div>

      <div className="flex flex-col px-6 py-10 sm:px-12">
        <Link to="/" className="self-start rounded-sm">
          <Wordmark name={site?.settings.brandName ?? 'Katalog'} />
        </Link>
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="my-auto w-full max-w-sm py-12"
          noValidate
        >
          <p className="eyebrow mb-2">Studio admin</p>
          <h1 className="display text-[3rem] leading-none">
            Selamat <em className="text-plum">datang</em> kembali.
          </h1>
          <div className="mt-10 space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-0 right-0 flex size-12 items-center justify-center text-muted hover:text-ink"
                  aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {show ? <EyeOff className="size-5" strokeWidth={1.5} /> : <Eye className="size-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy || !email || !password}>
              {busy ? 'Masuk…' : 'Masuk'}
            </button>
          </div>
        </motion.form>
        <Link to="/" className="self-start rounded-sm text-sm text-muted hover:text-ink">
          ← Kembali ke katalog
        </Link>
      </div>
    </div>
  )
}
