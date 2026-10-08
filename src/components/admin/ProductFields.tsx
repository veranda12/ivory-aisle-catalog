import { Link } from 'react-router'
import { useAdminChapters } from '@/lib/queries'
import { cx } from '@/lib/format'

export type ProductFieldsValue = {
  kind: 'GOWN' | 'ADDON'
  chapterId: string
  price: string
  deposit: string
  bust: string
  waist: string
  length: string
  description: string
  isActive: boolean
  isFeatured: boolean
}

export const EMPTY_PRODUCT: ProductFieldsValue = {
  kind: 'GOWN',
  chapterId: '',
  price: '',
  deposit: '',
  bust: '',
  waist: '',
  length: '',
  description: '',
  isActive: true,
  isFeatured: false,
}

const rupiahInput = (v: string) => (v ? Number(v).toLocaleString('id-ID') : '')
const digits = (v: string) => v.replace(/[^\d]/g, '')

/** Field detail produk yang dipakai di halaman upload & edit. */
export function ProductFields({
  value,
  onChange,
  idPrefix = 'pf',
  priceLabel = 'Harga sewa (Rp)',
}: {
  value: ProductFieldsValue
  onChange: (v: ProductFieldsValue) => void
  idPrefix?: string
  priceLabel?: string
}) {
  const { data: chapters } = useAdminChapters()
  const set = <K extends keyof ProductFieldsValue>(k: K, v: ProductFieldsValue[K]) => onChange({ ...value, [k]: v })
  const id = (s: string) => `${idPrefix}-${s}`
  const gown = value.kind === 'GOWN'

  return (
    <div className="space-y-5">
      <div>
        <p className="field-label">Jenis produk</p>
        <div className="grid grid-cols-2 gap-1 rounded-sm border border-line bg-paper/60 p-1" role="radiogroup">
          {(
            [
              ['GOWN', 'Gaun'],
              ['ADDON', 'Add-on / aksesori'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={value.kind === k}
              onClick={() => set('kind', k)}
              className={cx('min-h-10 rounded-xs text-sm font-semibold transition-colors', value.kind === k ? 'bg-plum text-paper' : 'text-ink-soft hover:bg-mist/60')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {gown && (
        <div>
          <label htmlFor={id('chapter')} className="field-label">
            Chapter
          </label>
          <select id={id('chapter')} className="input" value={value.chapterId} onChange={(e) => set('chapterId', e.target.value)}>
            <option value="">— Tanpa chapter —</option>
            {chapters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numeral ? `${c.numeral}. ` : ''}
                {c.name}
                {c.isActive ? '' : ' (nonaktif)'}
              </option>
            ))}
          </select>
          {chapters && !chapters.length && (
            <p className="mt-1 text-xs text-muted">
              Belum ada chapter.{' '}
              <Link to="/admin/chapters" className="text-plum underline">
                Buat chapter
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('price')} className="field-label">
            {gown ? priceLabel : 'Harga (Rp)'}
          </label>
          <input id={id('price')} className="input" inputMode="numeric" value={rupiahInput(value.price)} onChange={(e) => set('price', digits(e.target.value))} placeholder="opsional" />
        </div>
        {gown && (
          <div>
            <label htmlFor={id('deposit')} className="field-label">
              Deposit (Rp)
            </label>
            <input id={id('deposit')} className="input" inputMode="numeric" value={rupiahInput(value.deposit)} onChange={(e) => set('deposit', digits(e.target.value))} placeholder="opsional" />
          </div>
        )}
      </div>

      {gown && (
        <div>
          <p className="field-label">Ukuran</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['bust', 'Dada', '86–94 cm'],
                ['waist', 'Pinggang', '70–78 cm'],
                ['length', 'Panjang', '150 cm'],
              ] as const
            ).map(([k, label, ph]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs text-muted">{label}</span>
                <input className="input min-h-11 px-2.5 text-[0.95rem]" value={value[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} maxLength={40} />
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor={id('desc')} className="field-label">
          Deskripsi
        </label>
        <textarea id={id('desc')} className="input" value={value.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} placeholder="Detail bahan, potongan, catatan fitting…" />
      </div>

      <div className="space-y-2">
        <Toggle checked={value.isActive} onChange={(v) => set('isActive', v)} title="Tampil di katalog" hint={value.isActive ? 'Pengunjung bisa melihatnya' : 'Disimpan sebagai draf'} />
        {gown && <Toggle checked={value.isFeatured} onChange={(v) => set('isFeatured', v)} title="Unggulan" hint="Diutamakan di slider beranda" />}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint?: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-sm border border-line bg-paper/60 px-4">
      <span>
        <span className="block font-semibold">{title}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-plum" />
    </label>
  )
}

/** Ubah nilai form menjadi body API. */
export function productPayload(v: ProductFieldsValue) {
  const gown = v.kind === 'GOWN'
  return {
    kind: v.kind,
    chapterId: gown && v.chapterId ? v.chapterId : null,
    price: v.price || null,
    deposit: gown ? v.deposit || null : null,
    bust: gown ? v.bust : null,
    waist: gown ? v.waist : null,
    length: gown ? v.length : null,
    description: v.description,
    isActive: v.isActive,
    isFeatured: gown ? v.isFeatured : false,
  }
}
