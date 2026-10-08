import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'motion/react'
import { CalendarHeart, ChevronLeft, ChevronRight, Gift, Package, ShoppingBag, Sparkles, Undo2, Wallet, MessageCircle } from 'lucide-react'
import type { ContentItem } from '@shared/content'
import { useLang } from '@/lib/i18n'
import { addDays, formatDay, saveEventDate, useSiteData, waLink } from '@/lib/site'
import { cx } from '@/lib/format'

const SILK = [0.22, 1, 0.36, 1] as const
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Judul section: huruf sambung + garis ornamen emas. */
export function SectionTitle({
  children,
  sub,
  align = 'left',
  light,
  className,
}: {
  children: React.ReactNode
  sub?: React.ReactNode
  align?: 'left' | 'center'
  light?: boolean
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1, ease: SILK }}
      className={cx(align === 'center' && 'text-center', className)}
    >
      <h2 className={cx('script pl-1.5 text-[2.6rem] md:text-[4rem]', light ? 'text-gold-soft' : 'text-plum')}>{children}</h2>
      {sub && <p className={cx('mt-3 max-w-xl text-[1.0625rem]', align === 'center' && 'mx-auto', light ? 'text-blush/75' : 'text-ink-soft')}>{sub}</p>}
    </motion.div>
  )
}

const JOURNEY_ICONS = [ShoppingBag, MessageCircle, Wallet, Package, Sparkles, Undo2, Gift]

/** Timeline langkah pemesanan — langkah menyala saat di-scroll. */
export function OrderJourney({ steps }: { steps: ContentItem[] }) {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 55%'] })
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <ol ref={ref} className="relative mx-auto max-w-2xl">
      <span className="absolute top-2 bottom-2 left-[1.375rem] w-px bg-line-strong/60 md:left-[1.625rem]" aria-hidden />
      <motion.span style={{ height: fill }} className="absolute top-2 left-[1.375rem] w-px bg-plum md:left-[1.625rem]" aria-hidden />
      {steps.map((s, i) => (
        <JourneyStep key={i} step={s} index={i} />
      ))}
    </ol>
  )
}

function JourneyStep({ step, index }: { step: ContentItem; index: number }) {
  const ref = useRef<HTMLLIElement>(null)
  const lit = useInView(ref, { margin: '-30% 0px -45% 0px' })
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (lit) setSeen(true)
  }, [lit])
  const Icon = JOURNEY_ICONS[index % JOURNEY_ICONS.length]!
  const on = lit || seen

  return (
    <li ref={ref} className="relative flex gap-5 pb-8 last:pb-0 md:gap-7">
      <motion.span
        animate={{ scale: lit ? 1.08 : 1 }}
        transition={{ duration: 0.5, ease: SILK }}
        className={cx(
          'relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-700 md:size-[3.25rem]',
          on ? 'border-plum bg-plum text-blush' : 'border-line-strong bg-paper text-muted',
        )}
      >
        <Icon className="size-5" strokeWidth={1.4} />
      </motion.span>
      <div
        className={cx(
          'flex-1 rounded-md border px-5 py-4 transition-[background-color,box-shadow,opacity,border-color] duration-700',
          lit ? 'border-gold/40 bg-paper shadow-lift' : on ? 'border-transparent bg-paper/60 opacity-90' : 'border-transparent bg-paper/30 opacity-55',
        )}
      >
        <p className="font-display text-[1.45rem] leading-tight">
          <span className="mr-2 text-gold italic">{ROMAN[index] ?? index + 1}.</span>
          {step.title}
        </p>
        <p className="mt-1 text-ink-soft">{step.body}</p>
      </div>
    </li>
  )
}

/** Kalender panduan periode sewa: pilih tanggal acara → hari terima & kembali ditandai. */
export function PeriodGuide({ guide }: { guide: ContentItem[] }) {
  const { lang, t } = useLang()
  const { settings } = useSiteData()
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [event, setEvent] = useState(() => addDays(todayIso, 7))

  const d1 = addDays(event, -1)
  const d3 = addDays(event, 1)
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const startOffset = first.getDay()
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), 1 - startOffset + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { iso, day: d.getDate(), inMonth: d.getMonth() === month.getMonth() }
  })
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 8, 1 + i).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { weekday: 'narrow' }),
  )
  const roleOf = (iso: string) => (iso === d1 ? 1 : iso === event ? 2 : iso === d3 ? 3 : 0)
  const roleClass = ['', 'bg-blush-deep text-wine', 'bg-plum text-blush', 'bg-lavender-deep text-plum']

  return (
    <div className="grid max-w-md gap-8">
      <div className="rounded-lg border border-gold/30 bg-paper p-4 shadow-lift sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="icon-btn size-10" aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="size-5" strokeWidth={1.5} />
          </button>
          <p className="font-display text-xl" aria-live="polite">
            {month.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' })}
          </p>
          <button type="button" className="icon-btn size-10" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid">
          {weekdays.map((w, i) => (
            <span key={i} className="pb-1 text-xs font-semibold text-muted">
              {w}
            </span>
          ))}
          {cells.map((c) => {
            const role = roleOf(c.iso)
            const past = c.iso < todayIso
            return (
              <button
                key={c.iso}
                type="button"
                disabled={past}
                onClick={() => {
                  setEvent(c.iso)
                  saveEventDate(c.iso)
                }}
                aria-pressed={role === 2}
                aria-label={formatDay(c.iso, lang)}
                className={cx(
                  'relative flex aspect-square items-center justify-center rounded-sm text-[0.95rem] tabular-nums transition-colors duration-300',
                  role ? roleClass[role] : c.inMonth ? 'text-ink hover:bg-mist' : 'text-muted/50 hover:bg-mist/50',
                  past && 'cursor-not-allowed opacity-35',
                )}
              >
                {c.day}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-5 text-ink-soft">{t('rent.periodHint')}</p>
        <ol className="space-y-4">
          {guide.slice(0, 3).map((g, i) => (
            <li key={i} className="flex gap-4">
              <span className={cx('mt-0.5 h-10 w-1.5 shrink-0 rounded-full', ['bg-blush-deep', 'bg-plum', 'bg-lavender-deep'][i])} />
              <div>
                <p className="font-semibold">
                  <span className={cx('font-display text-lg italic', ['text-berry', 'text-plum', 'text-orchid'][i])}>
                    {formatDay([d1, event, d3][i]!, lang)}
                  </span>{' '}
                  · {g.title}
                </p>
                <p className="text-ink-soft">{g.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {settings.whatsapp && (
          <a
            href={waLink(
              settings.whatsapp,
              t('wa.period', { brand: settings.brandName, date: formatDay(event, lang), d1: formatDay(d1, lang), d3: formatDay(d3, lang) }),
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-7"
          >
            <CalendarHeart className="size-4" strokeWidth={1.6} /> {t('rent.ask')}
          </a>
        )}
      </div>
    </div>
  )
}

/** Daftar bernomor sederhana untuk syarat, kebijakan, dll. */
export function NumberedList({ items, columns = 1 }: { items: ContentItem[]; columns?: 1 | 2 }) {
  return (
    <ol className={cx('grid gap-3', columns === 2 && 'md:grid-cols-2')}>
      {items.map((it, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: SILK, delay: (i % 4) * 0.05 }}
          className="rounded-md border border-line/70 bg-paper/80 p-5"
        >
          <p className="font-display text-[1.35rem] leading-tight">
            <span className="mr-2 text-gold">{i + 1}.</span>
            {it.title}
          </p>
          <p className="mt-1.5 text-ink-soft">{it.body}</p>
        </motion.li>
      ))}
    </ol>
  )
}
