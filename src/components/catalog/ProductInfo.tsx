import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarHeart, MessageCircle, Share2 } from 'lucide-react'
import type { PhotoDTO } from '@shared/types'
import { formatPrice, cx } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import { addDays, formatDay, loadEventDate, saveEventDate, useSiteData, waLink } from '@/lib/site'
import { useToast } from '@/components/ui/Toast'

export function groupTags(photo: PhotoDTO) {
  const groups = new Map<string, { name: string; slug: string; tags: PhotoDTO['tags'] }>()
  for (const t of photo.tags) {
    const g = groups.get(t.categorySlug) ?? { name: t.categoryName, slug: t.categorySlug, tags: [] }
    g.tags.push(t)
    groups.set(t.categorySlug, g)
  }
  return [...groups.values()]
}

export function useShareLook() {
  const toast = useToast()
  const { t } = useLang()
  return async (photo: PhotoDTO) => {
    const url = `${window.location.origin}/catalog/${photo.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: photo.title, url })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast(t('product.copied'))
    } catch {
      toast(url, { tone: 'error' })
    }
  }
}

/** Harga sewa, deposit, ukuran, tag, dan tombol booking WhatsApp. */
export function ProductInfo({ photo, onNavigate, size = 'lg' }: { photo: PhotoDTO; onNavigate?: () => void; size?: 'md' | 'lg' }) {
  const { t, lang } = useLang()
  const { settings } = useSiteData()
  const share = useShareLook()
  const [eventDate, setEventDate] = useState(loadEventDate)
  const price = formatPrice(photo.price)
  const deposit = formatPrice(photo.deposit)
  const groups = groupTags(photo)
  const isAddon = photo.kind === 'ADDON'
  const measures = [
    { label: t('product.bust'), value: photo.bust },
    { label: t('product.waist'), value: photo.waist },
    { label: t('product.length'), value: photo.length },
  ].filter((m) => m.value)

  const today = new Date().toISOString().slice(0, 10)
  const dateText = eventDate
    ? `${formatDay(eventDate, lang)} (${formatDay(addDays(eventDate, -1), lang)} – ${formatDay(addDays(eventDate, 1), lang)})`
    : t('wa.dateUnknown')
  const bookHref = settings.whatsapp
    ? waLink(
        settings.whatsapp,
        t('wa.product', { brand: settings.brandName, title: photo.title, url: `${window.location.origin}/catalog/${photo.slug}`, date: dateText }),
      )
    : null

  return (
    <div>
      {photo.chapter && (
        <Link to={`/chapters/${photo.chapter.slug}`} onClick={onNavigate} className="text-[0.7rem] font-semibold tracking-[0.2em] text-gold uppercase hover:text-plum">
          Chapter {photo.chapter.numeral} · {photo.chapter.name}
        </Link>
      )}
      <h2 className={cx('script mt-1 text-plum', size === 'lg' ? 'text-[3.2rem] md:text-[4rem]' : 'text-[2.6rem] lg:text-[3.2rem]')}>{photo.title}</h2>

      {price && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <p className="font-display text-[1.9rem] text-ink lining-nums">{price}</p>
          {!isAddon && <p className="text-sm text-muted">{t('product.period', { n: settings.rentalDays || '3' })}</p>}
        </div>
      )}

      {(deposit || measures.length > 0) && (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-gold/30 bg-gold/20 text-sm sm:grid-cols-4">
          {deposit && (
            <div className="bg-paper px-3 py-2.5">
              <dt className="text-xs text-muted">{t('product.deposit')}</dt>
              <dd className="font-semibold lining-nums">{deposit}</dd>
            </div>
          )}
          {measures.map((m) => (
            <div key={m.label} className="bg-paper px-3 py-2.5">
              <dt className="text-xs text-muted">{m.label}</dt>
              <dd className="font-semibold lining-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {photo.description && <p className="mt-5 leading-relaxed text-ink-soft">{photo.description}</p>}

      {groups.length > 0 && (
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-t border-line pt-5">
          {groups.map((g) => (
            <div key={g.slug} className="contents">
              <dt className="eyebrow pt-0.5">{g.name}</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1 text-[0.9375rem]">
                {g.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/${isAddon ? 'add-on' : 'catalog'}?f=${g.slug}.${tag.slug}`}
                    onClick={onNavigate}
                    className="underline decoration-line-strong underline-offset-4 hover:text-plum hover:decoration-plum"
                  >
                    {tag.name}
                  </Link>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Booking */}
      <div className="mt-7 space-y-3">
        {bookHref && !isAddon && (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <CalendarHeart className="size-4 text-plum" strokeWidth={1.6} /> {t('product.eventDate')}
            </span>
            <input
              type="date"
              min={today}
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value)
                saveEventDate(e.target.value)
              }}
              className="input"
            />
          </label>
        )}
        <div className="flex gap-2">
          {bookHref && (
            <a href={bookHref} target="_blank" rel="noreferrer" className="btn-primary flex-1 tracking-[0.06em] uppercase">
              <MessageCircle className="size-4" strokeWidth={1.75} /> {t('cta.book')}
            </a>
          )}
          <button type="button" className={cx('btn-secondary', !bookHref && 'flex-1')} onClick={() => share(photo)} aria-label={t('cta.share')}>
            <Share2 className="size-4" strokeWidth={1.75} />
            <span className={bookHref ? 'sr-only sm:not-sr-only' : ''}>{t('cta.share')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
