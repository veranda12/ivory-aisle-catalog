import { useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useFocusTrap } from './Sheet'
import { useLockBody } from '@/lib/hooks'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  busy,
  tone = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  useLockBody(open)
  useFocusTrap(open, ref, onCancel)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onCancel}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[400px] rounded-lg bg-paper p-6 shadow-lift outline-none sm:p-7"
          >
            <h2 id={titleId} className="display text-[2rem] leading-tight">
              {title}
            </h2>
            <p id={descId} className="mt-2 text-ink-soft">
              {description}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy} data-autofocus>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Memproses…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
