import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleAlert } from 'lucide-react'

type Toast = { id: number; message: string; tone: 'success' | 'error'; action?: { label: string; onClick: () => void } }
type Push = (message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => void

const ToastContext = createContext<Push>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback<Push>((message, opts) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? 'success', action: opts?.action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-md bg-ink py-3 pr-3 pl-4 text-[0.9375rem] text-paper shadow-lift"
            >
              {t.tone === 'success' ? (
                <Check className="size-4 shrink-0 text-blush" strokeWidth={2} />
              ) : (
                <CircleAlert className="size-4 shrink-0 text-blush" strokeWidth={2} />
              )}
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={t.action.onClick}
                  className="rounded-sm px-2 py-1 font-semibold text-blush underline-offset-4 hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
