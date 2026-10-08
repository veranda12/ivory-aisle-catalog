import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HardDrive, LogOut } from 'lucide-react'
import { AdminHeader } from './AdminLayout'
import { keys, useMe, useSettings } from '@/lib/queries'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import type { SiteSettings } from '@shared/types'

const FIELDS: { key: keyof SiteSettings; label: string; hint?: string; max: number; multiline?: boolean; inputMode?: 'numeric' }[] = [
  { key: 'brandName', label: 'Nama brand', max: 60 },
  { key: 'tagline', label: 'Tagline', hint: 'Muncul di footer & hasil pencarian Google', max: 120 },
  { key: 'heroLine1', label: 'Judul hero — baris 1', max: 60 },
  { key: 'heroLine2', label: 'Judul hero — baris 2 (miring)', max: 80 },
  { key: 'heroNote', label: 'Kalimat pengantar (cadangan)', hint: 'Teks hero utama diatur di Konten → Beranda', max: 240, multiline: true },
  { key: 'city', label: 'Kota', max: 60 },
  { key: 'rentalDays', label: 'Lama periode sewa (hari)', hint: 'Tampil sebagai "Harga untuk 3 hari" di halaman produk', max: 2, inputMode: 'numeric' },
  { key: 'whatsapp', label: 'Nomor WhatsApp', hint: 'mis. 081234567890 — tombol "Tanyakan look ini" muncul bila diisi', max: 30, inputMode: 'numeric' },
  { key: 'instagram', label: 'Instagram', hint: 'tanpa @', max: 60 },
]

export default function SettingsPage() {
  const { data, isPending } = useSettings()
  const { data: me } = useMe()
  const [form, setForm] = useState<SiteSettings | null>(null)
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (data) setForm(data.settings)
  }, [data])

  const save = useMutation({
    mutationFn: (values: SiteSettings) => api<{ settings: SiteSettings }>('/admin/settings', { method: 'PUT', body: values }),
    onSuccess: (res) => {
      setForm(res.settings)
      qc.invalidateQueries({ queryKey: keys.settings })
      qc.invalidateQueries({ queryKey: keys.site })
      toast('Pengaturan disimpan')
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear()
      navigate('/admin/login', { replace: true })
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (form) save.mutate(form)
  }

  return (
    <div>
      <AdminHeader eyebrow="Studio" title="Pengaturan" />
      <div className="grid gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-10">
        <form onSubmit={submit} className="max-w-xl space-y-5">
          <h2 className="display text-[1.75rem] italic">Identitas & kontak</h2>
          {isPending || !form ? (
            [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)
          ) : (
            <>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="field-label">
                    {f.label}
                  </label>
                  {f.multiline ? (
                    <textarea id={f.key} className="input" maxLength={f.max} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <input
                      id={f.key}
                      className="input"
                      maxLength={f.max}
                      inputMode={f.inputMode}
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                  {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                </div>
              ))}
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={save.isPending || me?.role !== 'ADMIN'}>
                {save.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}
              </button>
              {me?.role !== 'ADMIN' && <p className="text-sm text-muted">Hanya admin yang bisa mengubah pengaturan.</p>}
            </>
          )}
        </form>

        <aside className="space-y-10">
          <PasswordForm />
          <section>
            <h2 className="display mb-3 text-[1.75rem] italic">Penyimpanan</h2>
            <p className="flex items-center gap-2 text-ink-soft">
              <HardDrive className="size-4" strokeWidth={1.5} />
              {data?.storageDriver === 'vercel-blob' ? 'Vercel Blob' : 'Folder lokal (./uploads)'}
            </p>
            {data?.storageDriver === 'local' && (
              <p className="mt-2 text-sm text-muted">Mode development. Di Vercel, hubungkan Vercel Blob agar foto tersimpan permanen.</p>
            )}
          </section>
          <section className="border-t border-line pt-6">
            <p className="text-sm text-muted">Masuk sebagai</p>
            <p className="font-semibold">{me?.email}</p>
            <button type="button" className="btn-secondary mt-4 w-full" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="size-4" strokeWidth={1.5} /> Keluar
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const toast = useToast()
  const change = useMutation({
    mutationFn: () => api('/auth/password', { method: 'POST', body: { currentPassword: current, newPassword: next } }),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      toast('Password diganti')
    },
    onError: (err) => toast((err as Error).message, { tone: 'error' }),
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        change.mutate()
      }}
      className="space-y-4"
    >
      <h2 className="display text-[1.75rem] italic">Ganti password</h2>
      <input type="text" autoComplete="username" hidden readOnly />
      <div>
        <label htmlFor="cur" className="field-label">
          Password saat ini
        </label>
        <input id="cur" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="new" className="field-label">
          Password baru
        </label>
        <input id="new" type="password" autoComplete="new-password" minLength={8} className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="mt-1 text-xs text-muted">Minimal 8 karakter.</p>
      </div>
      <button type="submit" className="btn-secondary w-full" disabled={!current || next.length < 8 || change.isPending}>
        {change.isPending ? 'Menyimpan…' : 'Ganti password'}
      </button>
    </form>
  )
}
