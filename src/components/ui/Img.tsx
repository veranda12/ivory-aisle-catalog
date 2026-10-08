import { useState, type CSSProperties } from 'react'
import { cx } from '@/lib/format'

type Props = {
  src: string
  alt: string
  width?: number
  height?: number
  blur?: string | null
  className?: string
  imgClassName?: string
  eager?: boolean
  sizes?: string
  style?: CSSProperties
  /** true = ikuti rasio asli foto (mencegah layout shift). false = isi wadah (object-cover). */
  intrinsic?: boolean
}

/**
 * Gambar dengan placeholder blur + reveal halus.
 * Rasio aspek diketahui dari database, jadi grid tidak "melompat" saat foto dimuat.
 */
export function Img({ src, alt, width, height, blur, className, imgClassName, eager, sizes, style, intrinsic = true }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const ratio = intrinsic && width && height ? `${width} / ${height}` : undefined

  return (
    <div
      className={cx('relative overflow-hidden bg-mist', className)}
      style={{
        aspectRatio: ratio,
        ...style,
      }}
    >
      {!loaded && !failed && !blur && <div className="skeleton absolute inset-0" aria-hidden />}
      {blur && !loaded && (
        // Placeholder 16px yang diperbesar & diburamkan — jauh lebih ringan daripada backdrop-filter.
        <img src={blur} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-xl" />
      )}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted">
          Foto tidak dapat dimuat
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          draggable={false}
          className={cx(
            'absolute inset-0 size-full object-cover transition-[opacity,transform,filter] duration-[900ms] ease-(--ease-silk) motion-reduce:transition-none',
            loaded ? 'scale-100 opacity-100 blur-0' : 'scale-[1.03] opacity-0 blur-sm',
            imgClassName,
          )}
        />
      )}
    </div>
  )
}
