import { Link } from 'react-router'
import { motion } from 'motion/react'
import { BookOpen, ChevronRight, ExternalLink, MessageSquareQuote, Settings, Sparkles, Tags } from 'lucide-react'
import { AdminHeader } from './AdminLayout'

const ITEMS = [
  { to: '/admin/tags', icon: Tags, title: 'Tag & filter', hint: 'Kategori dan tag untuk filter katalog' },
  { to: '/admin/content', icon: BookOpen, title: 'Konten halaman', hint: 'Beranda, cara sewa, fitting, tentang kami' },
  { to: '/admin/content?tab=testimonials', icon: MessageSquareQuote, title: 'Testimoni', hint: 'Ulasan pelanggan di beranda' },
  { to: '/admin/content?tab=wornby', icon: Sparkles, title: 'Worn By', hint: 'Figur & klien yang memakai koleksi' },
  { to: '/admin/settings', icon: Settings, title: 'Pengaturan', hint: 'Brand, kontak, akun' },
]

/** Menu tambahan untuk HP (navigasi bawah hanya muat 4 item). */
export default function MorePage() {
  return (
    <div>
      <AdminHeader eyebrow="Studio" title="Lainnya" />
      <ul className="mx-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70 sm:mx-6 lg:mx-10 lg:max-w-xl">
        {ITEMS.map((item, i) => (
          <motion.li key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={item.to} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-blush/30">
              <span className="flex size-10 items-center justify-center rounded-full bg-blush/60 text-plum">
                <item.icon className="size-5" strokeWidth={1.5} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{item.title}</span>
                <span className="text-sm text-muted">{item.hint}</span>
              </span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          </motion.li>
        ))}
        <li>
          <a href="/" target="_blank" className="flex min-h-14 items-center gap-4 px-4 py-3 text-ink-soft hover:bg-blush/30">
            <ExternalLink className="ml-2.5 size-5" strokeWidth={1.5} /> Lihat situs
          </a>
        </li>
      </ul>
    </div>
  )
}
