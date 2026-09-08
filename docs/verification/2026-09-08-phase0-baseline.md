# Fase 0 — Baseline lokal, produksi, dan rekonsiliasi

Tanggal pemeriksaan: 8 September 2026.
Branch kerja: `refactor-aliva-andrika` (dibuat dari `deploy/vps-live-20260823`, commit `1a9403b`).
Metode: pembacaan repositori lokal dan permintaan HTTP read-only ke `https://andrika-aliva.my.id`.
Tidak ada mutasi produksi, tidak ada penulisan ke database, tidak ada entri guestbook uji.

## 1. Sumber yang direfactor

Repositori lokal **tertinggal** dari produksi. Produksi menyajikan artefak minified
(`css/styles.min.css?v=20260825-css-min`, `js/main.min.js?v=20260825-js-min`) yang berasal dari
source lebih baru dan tidak ada di git mana pun (`git log --all -- '*.min.*'` kosong).
`last-modified` HTML produksi: 25 Agustus 2026 13:40 GMT.

Source produksi asli belum ditemukan; akses SSH ke VPS belum tersedia pada sesi ini.
Karena itu delta produksi direkonstruksi dari artefak publik dan **diporting ke source lokal**
sebelum refactor, sesuai catatan Fase 0 pada rencana. Bila source asli kemudian ditemukan,
daftar di bawah menjadi checklist pembanding, bukan pengganti.

## 2. Delta produksi yang harus ikut migrasi

| # | Area | Produksi (25 Agu 2026) | Lokal (commit 1a9403b) |
| --- | --- | --- | --- |
| D1 | `<head>` | `color-scheme: only light`, `theme-color #F5EFE4`, `apple-mobile-web-app-status-bar-style` | tidak ada |
| D2 | LCP | `<link rel=preload>` `assets/cover/first-photo-01.webp` `fetchpriority=high` | tidak ada |
| D3 | Render | critical CSS inline `<style id="critical-css">` untuk cover + language switcher | tidak ada |
| D4 | Font | self-host woff2: Cormorant Garamond (roman + italic), Jost Latin, DM Mono | Google Fonts CDN |
| D5 | CSS | `preload` + `onload` swap, `<noscript>` fallback | `<link rel=stylesheet>` biasa |
| D6 | Tailwind | `css/tailwind.css` statis hasil kompilasi (12.988 B) | `cdn.tailwindcss.com` + `js/tailwind.config.js` |
| D7 | Token | `--text-ink: hsl(var(--foreground))` ada | **tidak ada** — `var(--text-ink)` di `styles.css` tidak resolve |
| D8 | Undangan | `?type=group` → kunci `groupGuestGreeting` ("Kepada Yth. {name}") | hanya `guestGreeting` |
| D9 | Guestbook | `#rsvp-entries-viewport` + `.is-scrollable` / `.is-at-end`, mask + fade | daftar tanpa batas tinggi |
| D10 | Guestbook | entry = `__guest-info` (nama + waktu) ‖ attendance, lalu `__divider`, lalu pesan | header flex-wrap, tanpa divider |
| D11 | Audio | `preload="none"` | `preload="auto"` |
| D12 | GSAP | dimuat lazy hanya bila bukan native-scroll; janji `window.__scrollStoryReady` | 3 tag `<script>` CDN selalu diunduh |
| D13 | Aset | `couple-portrait1.webp`, `DSC00177/189/255/424_11zon.webp` | versi lama, 5–6 MB per file |
| D14 | Footer | baris "— Audrey Hepburn" tanpa `opacity-70` | dengan `opacity-70` |

Aset D13 dan font D4 diunduh dari produksi ke repositori pada Fase 0 ini
(9 file, 2,81 MB) karena tidak pernah masuk git.

## 3. Perilaku yang menjadi baseline

Urutan section: cover → hero → verse → couple → when → where → rsvp → gift → photo-band → footer.
Anchor `#hero #verse #couple #when #where #rsvp #gift #photo-band` dipertahankan.

- Bahasa ID default, tombol ID/EN tanpa reload, tersimpan di `localStorage['wedding-locale']`.
- `?to=<nama>` menampilkan sapaan pada tiket cover; `?type=group` mengubah bentuk sapaan.
- Cover memanggil `audio.play()` sinkron di dalam klik, lalu mengirim `invitation-opened`.
- Countdown menuju `2026-10-17T08:30:00` **tanpa offset zona** — lihat catatan terbuka §6.
- Jadwal tampil: Akad 07:00–10:00 WIB, Resepsi 10:30–14:00 WIB, timeline 07:00 / 08:00 / 10:30–14:00.
- RSVP: nama wajib, pesan wajib, tamu 1–4, `attending` / `not_attending`.
- Kontrak API `GET`/`POST /api/guestbook`, respons `entries` / `entry`.
- Deadline RSVP pada teks: 1 Oktober 2026.
- Maps: `https://maps.app.goo.gl/2s4H3gJi14MV8KGx7`.
- Gift: BNI 459408723 (Andrika), BNI 0727960012 (Aliva), alamat kirim di Cimahi Utara.

## 4. Pengukuran baseline produksi

Diukur 8 September 2026 dengan `curl --compressed` dari jaringan lokal pengembang.
Angka adalah byte yang benar-benar ditransfer, bukan simulasi perangkat atau Lighthouse.

| Kelompok | Byte | Catatan |
| --- | --- | --- |
| HTML | 52.210 | termasuk critical CSS inline |
| CSS (3 file) | 49.614 | tailwind 12.988 + design-system 1.195 + styles 35.431 |
| JS | 30.176 | `main.min.js`; GSAP menyusul hanya pada desktop |
| Font (3 woff2) | 79.204 | Cormorant roman, Jost, DM Mono |
| Cover (webp+jpeg+svg) | 905.707 | `first-photo-01.webp` 690.906 sendirian |
| **Total tampilan cover** | **1.116.911** | ±1,12 MB sebelum tamu menekan "Buka Undangan" |
| Galeri (13 foto) | 8.727.612 | ±8,73 MB saat `#photo-band` dicapai |

**Koreksi (ditambahkan setelah Fase 4).** Tabel di atas adalah penjumlahan manual atas
daftar berkas yang dipilih tangan, bukan pengukuran peramban, sehingga tidak sah dipakai
sebagai baseline. Pengukuran ulang dengan Chrome headless pada 390x844 @3x menunjukkan
produksi mengunduh **5.484.343 B sebelum tamu menekan "Buka Undangan"** dan **13.639.621 B**
untuk seluruh undangan. Selisihnya berasal dari empat potongan foto hero yang dimuat pada
resolusi penuh di balik cover. Angka inilah yang dipakai sebagai pembanding di
[laporan antislop](antislop-report.md).

Temuan header yang memengaruhi angka di atas:

- **Tidak ada `content-encoding`.** Respons membawa `vary: Accept-Encoding` tetapi tetap
  dikirim mentah walaupun klien meminta gzip/br/zstd. `styles.min.css` 35.431 B seharusnya
  ±7 KB terkompresi. Direktif `encode` pada Caddy perlu diperiksa di Fase 5.
- **Tidak ada `Cache-Control`.** Hanya `ETag` dan `Last-Modified`, sehingga setiap kunjungan
  melakukan revalidasi bersyarat untuk seluruh aset, termasuk foto galeri.
- `server: Caddy`, HTTP/2 aktif, `alt-svc` mengiklankan h3.

Foto galeri berukuran intrinsik 4000×6000 atau 6000×4000 piksel sementara kartu galeri
ditampilkan beberapa ratus piksel. Ini kandidat penghematan terbesar dan menjadi sasaran Fase 4.

## 5. Backup dan inventaris VPS — BELUM DIKERJAKAN

Perintah `ssh vps` ditolak oleh pembatasan izin pada sesi ini, sehingga bagian Fase 0 berikut
**belum terpenuhi** dan tidak boleh dianggap lulus:

- Verifikasi OS, Docker/Compose, disk, container, image/tag, port, network, restart policy.
- Pembacaan konfigurasi Caddy yang benar-benar aktif, document root, upstream API, mount database.
- Backup SQLite konsisten (`VACUUM INTO` atau online backup) beserta uji restore terisolasi.
- Penyimpanan artefak rilis lama untuk rollback.

Konsekuensi: Fase 5, 6, dan 7 diblokir sampai inventaris dan backup tersedia.
Fase 1–4 tidak bergantung padanya dan dijalankan lebih dulu.

## 6. Catatan terbuka untuk pemilik acara

1. **Target countdown.** Kode menghitung ke `2026-10-17T08:30:00` tanpa offset, sehingga
   nilainya berbeda antara peramban di Jakarta dan di zona lain. Timeline menampilkan akad 08:00
   dan kartu acara menampilkan 07:00–10:00. Refactor menetapkan offset `+07:00` secara eksplisit;
   **jam yang dituju masih perlu keputusan** — 08:00 (ijab qabul) atau 08:30 (nilai kode saat ini).
2. **`og:image` relatif.** Produksi mengirim `content="Aliva-thebride.jpeg"`, sehingga pratinjau
   WhatsApp/Twitter tidak mendapat gambar. Refactor menggantinya dengan URL absolut.
3. **Nomor rekening butuh JavaScript.** Markup mengirim `—` dan tombol salin `disabled`;
   nomor asli diisi dari `data-gift-account` oleh script. Tanpa JS, kedua rekening tidak terbaca.
   Refactor merender nomor langsung di HTML dan hanya menambahkan tombol salin lewat script.
