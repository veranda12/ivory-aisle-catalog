# Maison Lila — Katalog Foto

Katalog sewa gaun, mobile-first, dengan filter multi-tag dan panel admin yang bisa dioperasikan sepenuhnya dari HP.
Tanpa keranjang belanja dan tanpa checkout — pemesanan lewat WhatsApp.

**Halaman publik:** Beranda (hero slider, Featured Chapters, Worn By, Testimoni, Alur Pemesanan) · Chapter · Semua Koleksi · chapter di menu (mis. Korset) · Add On · Cara Sewa (Panduan Periode + Syarat) · Fitting Online · Tentang Kami · halaman produk (galeri, harga per periode, deposit, ukuran, tombol Pesan via WhatsApp dengan tanggal acara). Toggle bahasa ID/EN.

**Admin (`/admin`):** foto & produk (gaun / add-on, galeri hingga 12 foto, unggulan), chapter (sampul, nomor, tampil di menu), tag, konten halaman dwibahasa, testimoni, Worn By, pengaturan.

**Stack:** React 19 + Vite · Tailwind CSS v4 · lucide-react · Motion · TanStack Query · Express 5 (berjalan sebagai Vercel Function) · Prisma + PostgreSQL · sharp · Vercel Blob

```
src/            UI (React + Vite)
  pages/        Beranda, Katalog, Detail look, Admin (lazy-loaded)
  components/   catalog/ (masonry, filter, lightbox) · admin/ (tag picker) · ui/ (sheet, dialog, toast, img)
server/         API Express: auth, upload & pemrosesan gambar, storage, route
api/index.ts    Entry Vercel Function → server/app.ts
shared/         Tipe data bersama UI ↔ API
prisma/         Skema, migrasi, seed
```

## Menjalankan secara lokal

Butuh Node 20+ dan PostgreSQL (user `pos` / password `pos`).

```bash
createdb -U pos catalog_sample      # atau buat lewat pgAdmin
cp .env.example .env                # lalu isi SESSION_SECRET
npm install
npx prisma migrate deploy           # buat tabel
npm run db:seed                     # admin pertama + kategori/tag awal
npm run db:seed:demo                # (opsional) ±40 foto demo dari Wikimedia Commons
npm run db:seed:demo -- extras      # (opsional) add-on, contoh testimoni & Worn By (ditandai "contoh")
npm run dev                         # web :5173, API :3001
```

- Katalog: http://localhost:5173
- Admin: http://localhost:5173/admin (login pakai `ADMIN_EMAIL` / `ADMIN_PASSWORD` di `.env`)
- Uji dari HP di Wi-Fi yang sama: buka `http://<IP-laptop>:5173`

Isi nomor WhatsApp di **Admin → Pengaturan** — tombol "Pesan Sekarang" baru muncul setelah nomor diisi.

Di mode lokal, foto disimpan di `./uploads`. Foto demo hanya untuk mencoba tampilan. Hapus lewat Admin → Foto → Pilih → Pilih semua → Hapus.

## Deploy ke Vercel

1. Push repo ke GitHub, lalu **Import Project** di Vercel. Framework Vite terdeteksi otomatis dan `vercel.json` sudah mengatur build serta rewrites.
2. **Storage → Postgres** (Neon) atau database Postgres lain. Isi env berikut:
   - `DATABASE_URL`: URL *pooled*
   - `DIRECT_URL`: URL *non-pooled* (dipakai untuk migrasi)
3. **Storage → Blob**, hubungkan ke project. `BLOB_READ_WRITE_TOKEN` akan terisi otomatis.
4. Tambahkan env lainnya: `SESSION_SECRET` (min. 32 karakter acak), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_SITE_URL`.
5. Deploy. Perintah `vercel-build` otomatis menjalankan `prisma migrate deploy`.
6. Sekali saja, jalankan seed ke database produksi dari laptop:
   ```bash
   DATABASE_URL="<url produksi>" DIRECT_URL="<url produksi>" ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx prisma/seed.ts
   ```
7. Login ke `/admin`, lalu ganti password lewat **Pengaturan**.

Catatan: Vercel membatasi body request ±4.5 MB. Karena itu browser mengecilkan foto (maks. 2400px, JPEG) sebelum upload, lalu server memproses ulang dengan sharp.

## Cara kerja

- **Filter multi-tag.** URL `?f=model.gown,ukuran.m,ukuran.l,gaya.hijab-friendly`. Tag dalam satu kategori digabung dengan **OR** (ukuran M *atau* L), antar kategori digabung dengan **AND**. Setiap grup menjadi subquery `EXISTS` pada `photo_tags`, yang diindeks `(tag_id, photo_id)`.
- **Gambar.** Setiap upload divalidasi isinya oleh sharp (bukan cuma dari ekstensi file), metadata EXIF/GPS dibuang, lalu dibuat tiga versi:
  - `full.webp` ≤2000px untuk lightbox
  - `thumb.webp` 720px untuk grid
  - blur 16px base64 sebagai placeholder

  Rasio foto disimpan di database sehingga grid tidak bergeser saat foto dimuat.
- **Auth.** Password di-hash dengan bcrypt. Sesi berupa JWT HS256 di cookie `httpOnly` + `SameSite=Lax`, dan user/role dicek ulang ke database di setiap request admin. Request yang mengubah data wajib membawa header `x-catalog-request` (proteksi CSRF). Login dibatasi 8 percobaan per 15 menit, dicatat di database sehingga tetap berlaku di serverless.
- **Konten.** Nama brand, judul hero, kota, WhatsApp, dan Instagram diatur dari **Admin → Pengaturan**. Tombol "Tanyakan look ini" muncul otomatis begitu nomor WhatsApp diisi.

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | API + web dengan hot reload |
| `npm run build` | Typecheck + build produksi |
| `npm run db:migrate` | Buat migrasi baru setelah mengubah `schema.prisma` |
| `npm run db:seed` | Admin + tag awal (aman diulang) |
| `npm run db:seed:demo [n]` | Tambah n foto demo |
| `npm run db:studio` | Lihat data di Prisma Studio |
