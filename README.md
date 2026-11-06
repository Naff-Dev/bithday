# For You ♡ The Most Beautiful Story

A cinematic, personal romance and birthday website inspired by Netflix's UI aesthetics. Built with Express.js, responsive modern CSS, WebP optimized imagery, interactive audio playback, letter modal, and full-screen lightbox.

---

## Fitur Utama

- **Desain Sinematik Netflix**: Hero backdrop video sinematik bergerak tanpa suara (loop & muted) berkualitas tinggi, tag *A NETFLIX ORIGINAL*, typography serif elegan, dan gradient overlay gelap yang nyaman di mata.
- **Optimasi Penuh (WebP & MP4)**: 77 foto galeri telah dikonversi ke format WebP berkualitas tinggi dengan kompresi efisien, serta 4 video momen indah (`1.mp4` s/d `4.mp4`) dengan penamaan nomor yang rapi dan konsisten.
- **Trending Now Mendukung Video & Foto**: Carousel kartu Trending Now kini menampilkan cuplikan video interaktif dengan badge `▶ VIDEO` dan preview bergerak, serta foto-foto kenangan terbaik.
- **Halaman Khusus Galeri Ucapan (`/ucapan`)**:
  - Halaman terpisah bertajuk *"Apa Kata Mereka? A little collection of love, laughter, and memories"*.
  - Menggunakan algoritma **Fisher-Yates Shuffle** untuk pengacakan merata tanpa duplikat setiap kali halaman dibuka atau tombol *Acak Ulang Kenangan* ditekan.
  - Memadukan secara organik berbagai format: **Foto**, **Video**, **Pesan Suara (Voice Note)** dengan audio player dan waveform visualizer, serta **Pesan Tertulis (Letter Note)**.
  - Modal detail interaktif untuk memperbesar foto, memutar video dengan kontrol, memutar audio, atau membaca surat secara penuh.
  - Terhubung dengan API persisten `/api/ucapan` dan file penyimpanan `public/data/ucapan.json`.
- **Audio Eksternal Ringan**: Audio latar belakang `bgm.mp3` terpisah dengan kontrol equalizer interaktif.
- **Section Lengkap Sesuai Desain**:
  - `Hero`: The Most Beautiful Story dengan latar belakang video bergerak (`1.mp4`) tanpa suara dan tombol aksi.
  - `Trending Now`: Carousel kartu horizontal interaktif (video preview & foto).
  - `Quote & Stats`: Kutipan romantis, mosaik foto, dan statistik perjalanan cinta (80+ Foto & Video).
  - `01 Our Story`: Polaroid stack dan timeline kenangan.
  - `02 Our Memories`: Filter kategori (All, Videos, Daily, Adventures, Us, Special), 77 foto galeri, video clips, dan modal lightbox interaktif (bisa memutar video & foto penuh).
  - `03 Little Things I Love About You`: Kartu apresiasi hal-hal kecil.
  - `04 Places We've Been`: Kartu tempat kenangan.
  - `05 The Birthday Girl ♡`: Kartu profil dengan pill badges.
  - `06 A Letter For You`: Amplop vintage interaktif dan surat bertipe mesin tik.
  - `07 Happy Birthday Finale`: Hujan hati interaktif dan penutup romantis.
- **antislop Compliant**: Bebas karakter em dash, kontras teks teruji, aksesibilitas keyboard (navigasi panah di lightbox), semantic layout, dan no artificial fluff.

---

## Cara Menjalankan di Komputer Lokal

1. Buka terminal di folder project (`f:\sayang`).
2. Jalankan perintah:
   ```bash
   npm start
   ```
3. Buka browser di [http://localhost:3000](http://localhost:3000).

---

## Cara Deploy ke Vercel

### Opsi A: Lewat Vercel CLI (Paling Cepat)
Cukup jalankan perintah ini di terminal:
```bash
npx vercel
```
Ikuti instruksi login dan pilih default settings. Untuk deploy ke production:
```bash
npx vercel --prod
```

### Opsi B: Lewat GitHub & Vercel Dashboard
1. Inisialisasi git dan commit:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for you birthday website"
   ```
2. Buat repository baru di GitHub dan push project ini.
3. Buka [vercel.com](https://vercel.com), klik **Add New Project**, lalu import repository GitHub tersebut.
4. Klik **Deploy**. Vercel akan otomatis mendeteksi konfigurasi `vercel.json` dan meluncurkan website Anda.

---

## Struktur Folder

```text
sayang/
├── api/
│   └── index.js         # Entry point Express.js untuk local & Vercel Serverless
├── public/
│   ├── galeri/          # 77 foto kenangan (.webp) dan 4 video kenangan (.mp4)
│   ├── audio/           # File audio rekaman suara kenangan (.mp3)
│   ├── data/
│   │   └── ucapan.json  # Database persisten ucapan selamat ulang tahun
│   ├── bgm.mp3          # Audio musik latar
│   ├── ucapan.html      # Halaman khusus galeri ucapan acak (/ucapan)
│   └── index.html       # Single-page visual and interactive template
├── vercel.json          # Konfigurasi routing rewrite Vercel
├── package.json         # Dependency Express & run scripts
├── DESIGN.md            # Dokumentasi token desain & komponen
└── README.md            # Dokumentasi project
```

