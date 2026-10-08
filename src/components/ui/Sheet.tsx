import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useLockBody, useMediaQuery } from '@/lib/hooks'
import { cx } from '@/lib/format'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  /** 'auto' = bottom sheet di HP, panel samping di desktop. */
  variant?: 'auto' | 'bottom' | 'center'
  className?: string
}

const SILK = [0.22, 1, 0.36, 1] as const

export function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const el = ref.current
    const focusables = () =>
      el
        ? [...el.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(
            (n) => !n.hasAttribute('disabled') && n.offsetParent !== null,
          )
        : []
    const t = setTimeout(() => (el?.querySelector<HTMLElement>('[data-autofocus]') ?? el)?.focus(), 60)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const first = list[0]!
      const last = list[list.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, ref, onClose])
}

export function Sheet({ open, onClose, title, eyebrow, children, footer, variant = 'auto', className }: Props) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useLockBody(open)
  useFocusTrap(open, panelRef, onClose)

  const mode = variant === 'center' ? 'center' : variant === 'bottom' || !desktop ? 'bottom' : 'side'

  const motionProps =
    mode === 'bottom'
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
      : mode === 'side'
        ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
        : { initial: { opacity: 0, y: 24, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cx('fixed inset-0 z-50', mode === 'center' && 'flex items-center justify-center p-4')}>
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...motionProps}
            transition={{ duration: 0.55, ease: SILK }}
            className={cx(
              'absolute flex flex-col bg-paper shadow-sheet outline-none',
              mode === 'bottom' && 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-(--radius-sheet)',
              mode === 'side' && 'inset-y-0 right-0 w-[440px] max-w-full',
              mode === 'center' &&
                'relative max-h-[85dvh] w-full max-w-[440px] rounded-lg',
              className,
            )}
          >
            {mode === 'bottom' && <DragHandle onClose={onClose} />}
            <header className={cx('flex items-start justify-between gap-4 px-5', mode === 'bottom' ? 'pt-1 pb-3' : 'pt-6 pb-4 lg:px-7')}>
              <div>
                {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
                <h2 id={titleId} className="display text-3xl leading-none">
                  {title}
                </h2>
              </div>
              <button type="button" className="icon-btn -mt-1 -mr-2" onClick={onClose} aria-label="Tutup">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 lg:px-7">{children}</div>
            {footer && <footer className="border-t border-line px-5 pt-3 pb-safe lg:px-7"><div className="pb-3">{footer}</div></footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Pegangan sheet: geser ke bawah untuk menutup. */
function DragHandle({ onClose }: { onClose: () => void }) {
  const start = useRef<number | null>(null)
  return (
    <div
      className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center"
      onPointerDown={(e) => {
        start.current = e.clientY
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerUp={(e) => {
        if (start.current !== null && e.clientY - start.current > 50) onClose()
        start.current = null
      }}
      aria-hidden
    >
      <span className="h-1 w-10 rounded-full bg-line-strong" />
    </div>
  )
}
