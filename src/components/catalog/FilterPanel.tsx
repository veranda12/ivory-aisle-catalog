import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import type { FilterCategory } from '@shared/types'
import { cx } from '@/lib/format'

type Props = {
  categories: FilterCategory[]
  active: string[]
  onToggle: (key: string) => void
  compact?: boolean
  /** Kategori bisa dilipat (sidebar desktop). */
  collapsible?: boolean
}

const SILK = [0.22, 1, 0.36, 1] as const

/** Daftar tag per kategori. Bisa memilih banyak sekaligus. */
export function FilterPanel({ categories, active, onToggle, compact, collapsible }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return (
    <div className={compact ? 'space-y-5' : 'space-y-8'}>
      {categories.map((cat, ci) => {
        const selected = cat.tags.filter((t) => active.includes(`${cat.slug}.${t.slug}`)).length
        const isOpen = !collapsible || (open[cat.id] ?? (ci < 3 || selected > 0))
        const chips = (
          <div className="flex flex-wrap gap-2">
            {cat.tags.map((t) => {
              const key = `${cat.slug}.${t.slug}`
              const on = active.includes(key)
              return (
                <button key={t.id} type="button" aria-pressed={on} onClick={() => onToggle(key)} className="chip">
                  <motion.span
                    initial={false}
                    animate={{ width: on ? 14 : 0, opacity: on ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: SILK }}
                    className="-mr-1 inline-flex overflow-hidden"
                    aria-hidden
                  >
                    <Check className="size-3.5 shrink-0" strokeWidth={2.25} />
                  </motion.span>
                  {t.name}
                  <span className={on ? 'text-xs text-paper/70' : 'text-xs text-muted'}>{t.count}</span>
                </button>
              )
            })}
          </div>
        )
        return (
          <fieldset key={cat.id} className={cx(collapsible && 'border-b border-line pb-4')}>
            {collapsible ? (
              <legend className="w-full">
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [cat.id]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between py-1 text-left"
                >
                  <span className="text-[0.75rem] font-semibold tracking-[0.14em] text-ink uppercase">
                    {cat.name}
                    {selected > 0 && <span className="ml-2 text-plum">({selected})</span>}
                  </span>
                  <ChevronDown className={cx('size-4 text-muted transition-transform duration-300', isOpen && 'rotate-180')} />
                </button>
              </legend>
            ) : (
              <legend className="mb-3 flex w-full items-baseline justify-between">
                <span className="display text-[1.4rem] leading-none italic">{cat.name}</span>
                {selected > 0 && <span className="text-sm text-plum">{selected} ✓</span>}
              </legend>
            )}
            {collapsible ? (
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: SILK }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">{chips}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              chips
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
