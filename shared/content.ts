// Konten halaman yang bisa diubah dari Admin → Konten.
// Disimpan sebagai JSON di tabel settings (key "content"), per bahasa.
// Versi EN boleh kosong per field — otomatis memakai versi ID.

export type ContentItem = { title: string; body: string }

export type LocalizedContent = {
  announcement: string
  heroKicker: string
  wornByTitle: string
  wornByIntro: string
  journey: ContentItem[]
  periodGuide: ContentItem[] // tepat 3: hari terima, hari pakai, hari kembali
  terms: ContentItem[]
  fittingIntro: string
  fittingSchedule: ContentItem[]
  fittingPolicy: ContentItem[]
  aboutTitle: string
  aboutIntro: string
  aboutBody: string
  why: ContentItem[]
}

export type Lang = 'id' | 'en'
export type SiteContent = { id: LocalizedContent; en: Partial<LocalizedContent> }

export const CONTENT_LIST_KEYS = ['journey', 'periodGuide', 'terms', 'fittingSchedule', 'fittingPolicy', 'why'] as const
export const CONTENT_TEXT_KEYS = [
  'announcement',
  'heroKicker',
  'wornByTitle',
  'wornByIntro',
  'fittingIntro',
  'aboutTitle',
  'aboutIntro',
  'aboutBody',
] as const

export const DEFAULT_CONTENT: SiteContent = {
  id: {
    announcement: 'Jelajahi chapter terbaru kami & siluet andalan musim ini',
    heroKicker: 'Ratusan gaun pilihan, dari vintage sampai modern — siap menemani hari pentingmu.',
    wornByTitle: 'Dikenakan oleh',
    wornByIntro: 'Dipakai dan ditata oleh musisi, kreator, dan perempuan-perempuan hebat — dari perayaan kecil sampai pemotretan editorial.',
    journey: [
      { title: 'Pilih gaun favoritmu', body: 'Jelajahi koleksi dan simpan pilihan yang ingin kamu sewa.' },
      { title: 'Konsultasi & booking via WhatsApp', body: 'Tanyakan ketersediaan tanggal dan ukuran, lalu amankan jadwalmu.' },
      { title: 'Pembayaran penuh di awal', body: 'Lunasi biaya sewa beserta deposit untuk mengonfirmasi pesanan.' },
      { title: 'Hari 1 — Gaun tiba', body: 'Gaun diantar ke alamatmu, siap untuk acaramu.' },
      { title: 'Hari 2 — Hari acara', body: 'Kenakan dan nikmati momenmu.' },
      { title: 'Hari 3 — Pengembalian', body: 'Kirim kembali gaun sesuai jadwal sewa yang disepakati.' },
      { title: 'Deposit kembali', body: 'Deposit dikembalikan setelah gaun lolos pemeriksaan kondisi.' },
    ],
    periodGuide: [
      { title: 'Hari pertama', body: 'Hari kamu menerima paket.' },
      { title: 'Hari kedua', body: 'Hari acaramu!' },
      { title: 'Hari ketiga', body: 'Hari kamu mengirim gaun kembali ke kami.' },
    ],
    terms: [
      { title: 'Periode sewa', body: 'Satu periode sewa terdiri dari tiga hari: hari pengiriman, hari pemakaian, dan hari pengembalian. Periode dimulai saat gaun diterima.' },
      { title: 'Biaya sewa', body: 'Pembayaran dilunasi saat booking. Tambahan hari sewa dikenakan biaya per hari sesuai ketentuan admin.' },
      { title: 'Ongkos kirim', body: 'Ongkos kirim pergi dan pulang ditanggung penyewa. Estimasi ongkir dapat berubah mengikuti tarif kurir.' },
      { title: 'Verifikasi identitas', body: 'Penyewa wajib melampirkan KTP/SIM yang masih berlaku. Data dijaga kerahasiaannya.' },
      { title: 'Deposit', body: 'Setiap sewa memerlukan deposit yang dikembalikan penuh setelah gaun kembali dalam kondisi baik.' },
      { title: 'Perawatan', body: 'Gaun tidak boleh dicuci, dipermak, atau ditusuk peniti/bros. Kerusakan atau noda permanen akan dikenakan biaya perbaikan.' },
      { title: 'Keterlambatan', body: 'Pengembalian yang terlambat dikenakan denda per hari.' },
      { title: 'Pembatalan', body: 'Pembatalan dapat dilakukan dengan potongan sebagian dari biaya sewa.' },
    ],
    fittingIntro: 'Belum yakin dengan ukurannya? Coba gaunnya di rumah dengan layanan fitting online kami — tanpa perlu datang ke studio.',
    fittingSchedule: [
      { title: 'Pagi — Gaun diantar', body: 'Gaun pilihanmu dikirim ke alamatmu lewat kurir instan.' },
      { title: 'Siang — Sesi mencoba', body: 'Coba dengan santai di rumah, lihat jatuhnya dan potongannya.' },
      { title: 'Sore — Gaun dijemput', body: 'Atur penjemputan kurir instan setelah sesi selesai.' },
    ],
    fittingPolicy: [
      { title: 'Biaya per item', body: 'Biaya fitting dihitung per gaun. Tanyakan tarif terbaru ke admin.' },
      { title: 'Maksimal 3 gaun', body: 'Setiap sesi bisa mencoba hingga tiga gaun.' },
      { title: 'Kembali di hari yang sama', body: 'Semua gaun wajib dikembalikan pada hari yang sama.' },
      { title: 'Area layanan', body: 'Saat ini tersedia untuk area kota kami dan sekitarnya.' },
    ],
    aboutTitle: 'Gaun yang dipilih dengan hati',
    aboutIntro: 'Kami mengurasi gaun vintage dan modern — masing-masing dipilih karena kualitas dan karakternya.',
    aboutBody: 'Entah itu harta vintage yang langka atau potongan modern dengan cerita sendiri, setiap gaun dipilih dengan teliti. Bagi kami, gaun yang tepat bukan soal mengikuti tren, tapi soal menemukan yang terasa seperti dirimu dan membuat momenmu semakin berkesan.',
    why: [
      { title: 'Dikurasi per chapter', body: 'Bukan scroll tanpa ujung — koleksi kami disusun per chapter dengan estetika yang jelas, jadi lebih mudah menemukan yang terasa seperti kamu.' },
      { title: 'Fitting dari rumah', body: 'Tanpa antre di showroom. Coba gaunnya di rumah, kami bantu soal ukuran dan styling.' },
      { title: 'Koleksi terbatas', body: 'Banyak gaun kami adalah potongan vintage satu-satunya atau diproduksi terbatas.' },
    ],
  },
  en: {
    announcement: 'Explore our newest chapters & signature silhouettes',
    heroKicker: 'Hundreds of curated gowns, from vintage to modern — ready for your day.',
    wornByTitle: 'Worn by',
    wornByIntro: 'Worn and styled by artists, creators, and inspiring women — from intimate celebrations to editorial shoots.',
    journey: [
      { title: 'Pick your favourite pieces', body: 'Browse the collection and choose what you would like to rent.' },
      { title: 'Consult & book via WhatsApp', body: 'Ask about dates and sizing, then secure your booking.' },
      { title: 'Full payment upfront', body: 'Settle the rental fee and security deposit to confirm your order.' },
      { title: 'Day 1 — Arrival', body: 'Your gown is delivered, ready for your occasion.' },
      { title: 'Day 2 — Your event', body: 'Wear it and enjoy the moment.' },
      { title: 'Day 3 — Return', body: 'Send the gown back on the agreed schedule.' },
      { title: 'Deposit refund', body: 'Your deposit is refunded once the gown passes our condition check.' },
    ],
    periodGuide: [
      { title: 'Day one', body: 'The day you receive the package.' },
      { title: 'Day two', body: 'Your event day!' },
      { title: 'Day three', body: 'The day you send it back to us.' },
    ],
    fittingIntro: 'Not sure about the fit? Try the gown at home with our online fitting service — no studio visit needed.',
    aboutTitle: 'Gowns chosen with heart',
    aboutIntro: 'We curate vintage and modern gowns, each chosen for its quality and character.',
  },
}

export function localize(content: SiteContent, lang: Lang): LocalizedContent {
  if (lang === 'id') return content.id
  const out = { ...content.id }
  for (const [k, v] of Object.entries(content.en)) {
    if (Array.isArray(v) ? v.length : v) (out as Record<string, unknown>)[k] = v
  }
  return out
}
