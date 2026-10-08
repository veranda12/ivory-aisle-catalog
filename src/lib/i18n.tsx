import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '@shared/content'

// Teks antarmuka publik dalam dua bahasa. Konten yang dikelola admin ada di shared/content.ts.
const dict = {
  'nav.home': { id: 'Beranda', en: 'Home' },
  'nav.chapters': { id: 'Chapter', en: 'Chapters' },
  'nav.all': { id: 'Semua Koleksi', en: 'All Collections' },
  'nav.addon': { id: 'Add On', en: 'Add On' },
  'nav.rent': { id: 'Cara Sewa', en: 'How to Rent' },
  'nav.fitting': { id: 'Fitting Online', en: 'Online Fitting' },
  'nav.about': { id: 'Tentang Kami', en: 'About Us' },
  'nav.menu': { id: 'Menu', en: 'Menu' },
  'nav.close': { id: 'Tutup menu', en: 'Close menu' },
  'nav.search': { id: 'Cari', en: 'Search' },
  'cta.book': { id: 'Pesan Sekarang', en: 'Book Now' },
  'cta.bookShort': { id: 'Pesan', en: 'Book' },
  'cta.explore': { id: 'Jelajahi koleksi', en: 'Explore the collection' },
  'cta.seeAll': { id: 'Lihat semua', en: 'See all' },
  'cta.openCatalog': { id: 'Buka katalog', en: 'Open catalogue' },
  'cta.askLook': { id: 'Tanyakan look ini', en: 'Ask about this look' },
  'cta.share': { id: 'Bagikan', en: 'Share' },
  'cta.lookPage': { id: 'Halaman look', en: 'View details' },
  'cta.clearAll': { id: 'Hapus semua', en: 'Clear all' },
  'cta.clearFilters': { id: 'Hapus filter', en: 'Clear filters' },
  'cta.retry': { id: 'Coba lagi', en: 'Try again' },
  'cta.whatsapp': { id: 'Chat WhatsApp', en: 'Chat on WhatsApp' },
  'cta.bookFitting': { id: 'Jadwalkan fitting', en: 'Book a fitting' },
  'home.featured': { id: 'Chapter Pilihan', en: 'Featured Chapters' },
  'home.featuredSub': { id: 'Koleksi kami disusun per chapter — tiap chapter punya cerita dan estetikanya sendiri.', en: 'Our collection is arranged in chapters — each with its own story and aesthetic.' },
  'home.testimonials': { id: 'Kata Mereka', en: 'Testimonials' },
  'home.journey': { id: 'Alur Pemesanan', en: 'Order Journey' },
  'home.new': { id: 'Baru masuk', en: 'Just arrived' },
  'home.closing': { id: 'Sudah ada yang kamu suka?', en: 'Found one you love?' },
  'home.closingSub': { id: 'Kirim fotonya, kami bantu cek ukuran dan tanggal yang tersedia.', en: 'Send it to us — we will check sizing and available dates.' },
  'home.looks': { id: 'look', en: 'looks' },
  'catalog.title': { id: 'Semua Koleksi', en: 'All Collections' },
  'catalog.eyebrow': { id: 'Koleksi', en: 'Collection' },
  'catalog.search': { id: 'Cari nama, warna, bahan…', en: 'Search name, colour, fabric…' },
  'catalog.filter': { id: 'Filter', en: 'Filter' },
  'catalog.sort': { id: 'Urutkan', en: 'Sort' },
  'catalog.refine': { id: 'Saring', en: 'Refine' },
  'catalog.show': { id: 'Tampilkan', en: 'Show' },
  'catalog.searching': { id: 'Mencari…', en: 'Searching…' },
  'catalog.all': { id: 'Semua', en: 'All' },
  'catalog.end': { id: 'Itu semua untuk saat ini.', en: 'That is everything for now.' },
  'catalog.emptyTitle': { id: 'Belum ada yang cocok.', en: 'Nothing matches yet.' },
  'catalog.emptyBody': { id: 'Tidak ada look dengan kombinasi filter ini. Coba lepas salah satunya.', en: 'No looks match these filters. Try removing one.' },
  'catalog.soonTitle': { id: 'Koleksi sedang disiapkan.', en: 'The collection is being prepared.' },
  'catalog.soonBody': { id: 'Look pertama akan segera tampil di sini.', en: 'The first looks will appear here soon.' },
  'catalog.errorTitle': { id: 'Katalog belum bisa dimuat.', en: 'The catalogue could not be loaded.' },
  'catalog.errorBody': { id: 'Sepertinya koneksi sedang bermasalah.', en: 'There seems to be a connection problem.' },
  'sort.newest': { id: 'Terbaru', en: 'Newest' },
  'sort.oldest': { id: 'Terlama', en: 'Oldest' },
  'sort.az': { id: 'Nama A–Z', en: 'Name A–Z' },
  'sort.price-asc': { id: 'Harga terendah', en: 'Lowest price' },
  'sort.price-desc': { id: 'Harga tertinggi', en: 'Highest price' },
  'addon.title': { id: 'Add On', en: 'Add On' },
  'addon.intro': { id: 'Veil, sarung tangan, kipas, payung, dan aksesori lain untuk melengkapi tampilanmu.', en: 'Veils, gloves, fans, parasols and other finishing touches for your look.' },
  'chapters.title': { id: 'Chapter', en: 'Chapters' },
  'chapters.intro': { id: 'Setiap chapter adalah satu cerita — pilih yang paling terasa seperti kamu.', en: 'Every chapter tells its own story — choose the one that feels like you.' },
  'product.period': { id: 'Harga untuk {n} hari', en: 'Price for a {n}-day period' },
  'product.deposit': { id: 'Deposit', en: 'Deposit' },
  'product.bust': { id: 'Lingkar dada', en: 'Bust' },
  'product.waist': { id: 'Lingkar pinggang', en: 'Waist' },
  'product.length': { id: 'Panjang', en: 'Length' },
  'product.eventDate': { id: 'Tanggal acara (opsional)', en: 'Event date (optional)' },
  'product.related': { id: 'Kamu mungkin juga suka', en: 'You may also like' },
  'product.back': { id: 'Kembali ke koleksi', en: 'Back to collection' },
  'product.photos': { id: 'foto', en: 'photos' },
  'product.missing': { id: 'Look ini sudah tidak ada.', en: 'This look is no longer available.' },
  'product.missingBody': { id: 'Mungkin sudah dihapus dari katalog. Masih banyak pilihan lain.', en: 'It may have been removed. There are plenty of other pieces.' },
  'product.swipe': { id: 'Geser foto ke kiri atau kanan', en: 'Swipe left or right' },
  'product.keys': { id: 'Gunakan ← → untuk berpindah look.', en: 'Use ← → to move between looks.' },
  'product.copied': { id: 'Tautan disalin', en: 'Link copied' },
  'wa.product': {
    id: 'Halo {brand}, aku tertarik dengan produk berikut:\n\n{title}\n{url}\n\nApakah masih tersedia untuk tanggal {date}?',
    en: 'Hello {brand}, I am interested in this piece:\n\n{title}\n{url}\n\nIs it available for {date}?',
  },
  'wa.general': { id: 'Halo {brand}, aku ingin bertanya tentang koleksi.', en: 'Hello {brand}, I would like to ask about your collection.' },
  'wa.fitting': { id: 'Halo {brand}, aku ingin menjadwalkan fitting online.', en: 'Hello {brand}, I would like to book an online fitting.' },
  'wa.period': { id: 'Halo {brand}, aku ingin sewa untuk acara tanggal {date} (terima {d1}, kembali {d3}). Apa saja yang tersedia?', en: 'Hello {brand}, I would like to rent for an event on {date} (receive {d1}, return {d3}). What is available?' },
  'wa.dateUnknown': { id: '....', en: '....' },
  'rent.title': { id: 'Cara Sewa', en: 'How to Rent' },
  'rent.period': { id: 'Panduan Periode', en: 'Period Guide' },
  'rent.periodHint': { id: 'Pilih tanggal acaramu — kami tandai kapan gaun tiba dan kapan dikembalikan.', en: 'Pick your event date — we will mark when the gown arrives and when it goes back.' },
  'rent.terms': { id: 'Syarat & Ketentuan', en: 'Terms & Conditions' },
  'rent.ask': { id: 'Tanyakan tanggal ini', en: 'Ask about these dates' },
  'fitting.title': { id: 'Fitting Online', en: 'Online Fitting' },
  'fitting.schedule': { id: 'Satu hari fitting', en: 'A day of fitting' },
  'fitting.policy': { id: 'Ketentuan fitting', en: 'Fitting policy' },
  'about.title': { id: 'Tentang Kami', en: 'About Us' },
  'about.why': { id: 'Kenapa kami', en: 'Why us' },
  'footer.studio': { id: 'Studio', en: 'Studio' },
  'footer.contact': { id: 'Kontak', en: 'Contact' },
  'footer.explore': { id: 'Jelajahi', en: 'Explore' },
  'footer.byAppointment': { id: 'Layanan online & fitting dengan janji temu', en: 'Online service & fittings by appointment' },
  'footer.manage': { id: 'Kelola katalog', en: 'Manage catalogue' },
  'footer.follow': { id: 'Ikuti kami di Instagram', en: 'Follow us on Instagram' },
  'notfound.title': { id: 'Halaman ini tidak ada.', en: 'This page does not exist.' },
  'notfound.body': { id: 'Mungkin tautannya salah ketik, atau halamannya sudah dipindah.', en: 'The link may be mistyped, or the page has moved.' },
  'skip': { id: 'Langsung ke konten', en: 'Skip to content' },
} satisfies Record<string, Record<Lang, string>>

export type DictKey = keyof typeof dict

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: DictKey, vars?: Record<string, string | number>) => string }

const LangContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'catalog-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    /* localStorage bisa diblokir */
  }
  return 'id'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* abaikan */
    }
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let text: string = dict[key]?.[lang] ?? key
        if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
        return text
      },
    }),
    [lang, setLang],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang harus di dalam LangProvider')
  return ctx
}
