import { motion, type HTMLMotionProps } from 'motion/react'

const SILK = [0.22, 1, 0.36, 1] as const

/** Fade + naik perlahan saat elemen masuk viewport. */
export function Reveal({ delay = 0, y = 28, children, ...rest }: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.1, ease: SILK, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Teks muncul baris per baris dari balik "tirai". */
export function LineReveal({ lines, className, delay = 0 }: { lines: React.ReactNode[]; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.3, ease: SILK, delay: delay + i * 0.14 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <Reveal className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center">
      <span className="mb-6 block h-16 w-px bg-linear-to-b from-transparent to-rose" aria-hidden />
      <h2 className="display text-[2.25rem] leading-tight italic">{title}</h2>
      <p className="mt-3 text-ink-soft">{body}</p>
      {action && <div className="mt-8">{action}</div>}
    </Reveal>
  )
}
