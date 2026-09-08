# Laporan kualitas UI (antislop) — refactor Andrika & Aliva

Tanggal: 8 September 2026.
Branch: `refactor-aliva-andrika`.
Mode: diterapkan **selama** pengerjaan (Fase 1–4), sesuai keputusan pada rencana refactor.
Sumber aturan: core antislop (R-01…R-38, C-1…C-5). Tidak ada skill tambahan yang dipasang,
dan `AGENTS.md`/`CLAUDE.md` tidak diubah, sesuai batasan pada rencana.

## Cara pemeriksaan

Build produksi (`astro build`) dilayani oleh static server lokal dengan `/api` diteruskan
ke Node API pada database sementara, sehingga bentuknya sama dengan produksi (same-origin).
Peramban: Google Chrome headless yang terpasang di mesin, dikendalikan lewat DevTools Protocol.

- Mobile: 390 x 844 CSS px, devicePixelRatio 3.
- Desktop: 1440 x 900 CSS px, devicePixelRatio 2.
- Reduced motion: Chrome dijalankan dengan `--force-prefers-reduced-motion`.
- Tanpa JavaScript: `Emulation.setScriptExecutionDisabled`.
- Kegagalan API: `Network.setBlockedURLs` pada `*/api/guestbook*`.

Tidak ada data yang ditulis ke database produksi. Semua kiriman uji masuk ke SQLite temporer.

## Design Read

> Undangan pernikahan personal untuk keluarga dan tamu, dengan bahasa visual editorial
> hangat di atas kertas parchment, dial **ENERGY 3 / RHYTHM 3 / MOTION 3** pada desktop,
> **MOTION 2** pada mobile (native scroll, tanpa GSAP), **MOTION 1** pada reduced motion.

Arah ini berasal dari desain yang sudah disetujui dan berjalan di produksi, bukan dari
tebakan agen. Refactor mempertahankannya; tidak ada palet, ilustrasi, struktur halaman,
atau theme toggle baru yang ditambahkan.

## Block 1 — Hard Gate

| Aturan | Status | Bukti |
| --- | --- | --- |
| R-02 em dash | **FAIL** | Empat teks warisan masih memakai `—`. Rinci di §"Temuan terbuka". |
| R-03 mobile | PASS | `scrollWidth - innerWidth = 0` pada cover dan seluruh halaman, 390 px dan 1440 px. Semua target sentuh nyata ≥ 44 px: ID 44x44, EN 44x44, "Buka di Maps" 189x44, label kehadiran 321x48 dan 321x64, "Kirim RSVP" 321x49, dua tombol salin 228x44, tombol musik 48x48. |
| R-17 angka | PASS | Satu-satunya angka dinamis adalah countdown dan jumlah foto; keduanya dihitung dari data nyata (`countdownTarget`, panjang `galleryPhotos`). Tidak ada statistik pemasaran. |
| R-18 testimoni | PASS | Guestbook hanya menampilkan entri dari API. Uji memakai database temporer; produksi tidak diisi ucapan fiktif. |
| R-23 aset | PASS | Tidak ada logo, avatar, atau foto yang dibuat. Semua foto adalah milik pasangan; alt text ditulis dari isi foto yang benar-benar diperiksa. |
| R-24 navigasi | PASS | Tidak ada navbar. Satu-satunya tautan keluar adalah Google Maps ke alamat venue. |
| R-25 kontras | PASS | Audit otomatis seluruh node teks pada dua viewport: 0 pelanggaran. Tiga kegagalan ditemukan dan diperbaiki, satu dikecualikan sebagai dekorasi. Rinci di §Kontras. |
| R-26 elemen interaktif | PASS | Setiap kontrol punya perilaku nyata, diklik satu per satu. Rinci di §Click-through. |
| R-27 state | PASS | Guestbook: loading, empty, ready, error (+ tombol coba lagi). Formulir: idle, submitting, success, error. Semua diamati. |
| R-28 FAQ | PASS | Tidak ada FAQ. |
| R-32 keyboard | PASS | Urutan Tab lengkap dan setiap elemen punya indikator fokus terlihat. Dua kegagalan ditemukan dan diperbaiki. Rinci di §Keyboard. |
| R-33 patch skrip | PASS | Semua perubahan ditulis di source. Satu integrasi build (`tools/prune-unused-assets.mjs`) menghapus aset yang tidak dirujuk dari `dist/`; ia tidak menyunting source atau CSS. |
| R-34 tema | PASS | Tidak ada theme toggle. Undangan sengaja satu tema terang; `color-scheme: only light` mencegah peramban mewarnai ulang. |
| R-35 verifikasi | PASS | Build dijalankan, halaman dijalankan, setiap kontrol diklik. Console bersih: 0 error, 0 warning, 0 exception, 0 request gagal (selain 429 yang memang diuji). |
| R-36 klaim | PASS | Tidak ada klaim keamanan, kepatuhan, atau performa pada UI. |
| R-37 arah desain | PASS | Design Read di atas berasal dari desain produksi yang sudah disetujui. |
| R-38 konten nyata | PASS | Nama, orang tua, tanggal, venue, rekening, dan alamat berasal dari `src/data/wedding.ts`, bukan karangan. |

## Block 2 — Purpose-Gate

Setiap teknik di bawah dipertahankan dari desain yang sudah berjalan; alasannya dicatat.

| Aturan | Status | Alasan satu baris |
| --- | --- | --- |
| R-01 gradien | PASS | Gradien hanya dipakai untuk memisahkan bab (parchment ke muted) dan untuk meredam foto cover agar teks tiket terbaca; bukan latar berwarna penuh. |
| R-04 ikon | PASS | Tiga ikon saja, semuanya harfiah: pin peta untuk Maps, dua lembar untuk salin, not balok untuk musik. Tidak ada sparkle atau bolt. |
| R-06 tipografi | PASS | Cormorant Garamond untuk suara perayaan, Jost untuk label, DM Mono untuk penanda editorial hero, Reflow Sans hanya untuk pernyataan hero. Empat peran, empat alasan. |
| R-07 latar | PASS | Tidak ada grid atau blueprint. Satu lapis grain 4% memberi tekstur kertas; itu identitas undangan cetak, bukan dekorasi teknologi. |
| R-08 panah | PASS | Satu panah `↓` pada petunjuk gulir hero, karena arahnya memang ke bawah. Tidak ada panah pada tombol. |
| R-09 badge | PASS | Satu badge, menandai status kehadiran nyata pada tiap ucapan. |
| R-10 glassmorphism | PASS | Satu elemen: pil pemilih bahasa yang mengambang di atas foto. |
| R-12 bayangan | PASS | Bayangan menandai satu tingkat elevasi (`.panel`), bukan dipasang di semua elemen. |
| R-13 glow | PASS | Tidak ada glow. `--ds-shadow-gold` hanya cincin fokus keyboard. |
| R-14 kartu | PASS | Kartu bervariasi menurut isi: dua kartu mempelai, dua kartu acara, dua kartu rekening, kartu ucapan berukuran mengikuti panjang pesan. |
| R-19 animasi | PASS | Motion mengikuti dial: tiket robek saat membuka, hero berlapis mengikuti gulir, bab mempelai dipin, panel galeri melebar. Semua hilang pada reduced motion. |
| R-22 ilustrasi | PASS | Dua potret mempelai adalah ilustrasi cat air milik pasangan, bukan stok. |

## Block 3 — Liveliness

| Pertanyaan | Jawab |
| --- | --- |
| Dial eksplisit? | Ya: ENERGY 3 / RHYTHM 3 / MOTION 3 desktop, MOTION 2 mobile, MOTION 1 reduced motion. |
| Output konsisten dengan dial? | Ya. RHYTHM 3 terbukti: cover tiket, hero grid empat baris, ayat terpusat, kartu mempelai, strip kalender, timeline dua kolom, formulir, kartu rekening, dan pita foto gelap semuanya berbeda komposisi. |
| Satu titik fokus per layar? | Ya. Cover: tiket. Hero: pernyataan tipografi. Tanggal: angka countdown. RSVP: formulir. Galeri: pita foto. |
| Whitespace struktural? | Ya. Jarak antar bab (`py-20 sm:py-28`) memisahkan bab; jarak dalam bab lebih rapat. |
| Satu aksen disengaja? | Ya. Emas (`--accent`) untuk pembatas, label, dan pilihan aktif. Rose dipakai hemat untuk penekanan. |
| Motif identitas? | Ya. Ornamen `✦` dan pembatas emas berlian berulang di cover, ayat, RSVP, hadiah, dan footer. |
| Design Read dideklarasikan? | Ya, di atas. |

## Block 4 — Craftsmanship & Quality Locks

| Item | Status | Catatan |
| --- | --- | --- |
| C-1 intensionalitas | PASS | Setiap perubahan visual pada refactor ini punya komentar alasan di CSS atau komponennya. |
| C-2 kelengkapan fungsi | PASS | Tombol salin rekening kini `hidden` sampai script menyalakannya, sehingga tanpa JS tidak ada kontrol mati. |
| C-3 komposisi ikut konten | PASS | Tidak ada bab yang ditambah. Urutan sama dengan baseline produksi. |
| C-4 ketahanan | PASS | Diuji pada mobile, desktop, reduced motion, tanpa JavaScript, dan dengan API mati. |
| C-5 bukti | PASS | Angka performa di bawah adalah hasil pengukuran, bukan klaim. |
| R-05 layout | PASS | Bukan template AI: tidak ada hero+3 kartu, tidak ada "How It Works", tidak ada logo bar, tidak ada pricing, footer satu kolom. |
| R-11 radius | PASS | Radius bervariasi menurut peran: 8 px panel, 12 px potongan hero, 10 px kartu galeri, 24 px tiket, penuh hanya pada pil bahasa. |
| R-15 CTA | PASS | "Buka Undangan", "Kirim RSVP", "Salin nomor rekening", "Buka di Maps". Semua menyebut tindakannya. |
| R-16 buzzword | PASS | Tidak ada. |
| R-20 identitas | PASS | Ganti nama pasangan dan undangan ini tetap khas: tiket robek, hero editorial berpotongan foto, pita foto gelap. |
| R-21 dark mode | PASS | Satu tema terang, disengaja, dengan alasan: foto dan kertas hangat. |
| R-29 palet | PASS | Tiga warna inti (parchment, ink, emas) + satu aksen (rose). Sage dipakai sekali untuk peran mempelai wanita. |
| R-30 kloning | PASS | Tidak meniru produk lain. Model motion New Form Capital adalah rujukan interaksi yang sudah dipilih pemilik proyek, bukan salinan visual. |
| R-31 alasan tertulis | PASS | Alasan tiap keputusan besar ada pada tabel Purpose-Gate dan komentar source. |

## Kontras (R-25)

Audit menghitung warna efektif tiap node teks terhadap latar yang benar-benar dicat,
termasuk opacity yang diwariskan, lalu membandingkannya dengan ambang WCAG yang tepat
untuk ukuran dan bobotnya. Teks 18 px reguler dinilai sebagai teks normal (4.5:1);
ambang 3:1 hanya untuk ≥ 24 px, atau ≥ 18.66 px bila bold.

Diperbaiki pada refactor ini:

| Elemen | Sebelum | Sesudah | Perbaikan |
| --- | --- | --- | --- |
| Label kehadiran terpilih (14 px) | 2.29 : 1 | 6.86 : 1 | Putih di atas emas diganti ink di atas emas (`--accent-foreground`). |
| Tombol bahasa non-aktif (12 px) | 3.97 : 1 | 5.71 : 1 | Opacity 0.82 dihapus; status aktif dibedakan lewat warna dan bobot. |
| Waktu pada ucapan (10,88 px) | 3.02 : 1 | 5.22 : 1 | Opacity 0.78 dihapus, lalu warnanya dipindah ke token teks baru. |
| Pesan ucapan (15,68 px) | 4.50 : 1 | 5.22 : 1 | Sama; 4.50 adalah ambangnya sendiri, bukan margin. |
| Label kehadiran non-aktif (14 px) | 4.50 : 1 | 5.22 : 1 | Sama. |
| Alamat pengiriman hadiah | 4.50 : 1 | 5.22 : 1 | Sama. |
| Jumlah foto galeri (12 px) | 4.09 : 1 | 4.76 : 1 | `#C9AF7E` menjadi `#D8C296`; diukur terhadap puncak radial pita (`rgb(93 75 60)`), bukan hanya bagian tergelapnya. |

Token `--color-text-muted` (`hsl(24 10% 42%)`) diperkenalkan untuk memisahkan nada muted
sebagai **permukaan** (`--muted-foreground`) dari nada muted sebagai **teks**. Yang kedua
harus terbaca; yang pertama tidak.

Dikecualikan, dengan alasan:

- Ornamen `✦ ✦ ✦` (1.68 : 1) adalah dekorasi murni, ditandai `aria-hidden="true"`, tidak
  membawa informasi. WCAG 1.4.3 mengecualikan teks dekoratif. Sengaja dibiarkan samar.

## Click-through (R-26, R-35)

Setiap kontrol dijalankan, bukan dibaca:

| Kontrol | Hasil |
| --- | --- |
| "Buka Undangan" | Cover robek, elemen dihapus dari DOM, scroll body dibuka, musik dimulai dari klik yang sama. |
| Tombol bahasa ID / EN | Judul RSVP berganti "Maukah Hadir Bersama Kami?" ↔ "Will You Join Us?", `html lang` ikut, alt foto galeri ikut, tenggat RSVP diformat ulang "1 Oktober 2026" ↔ "1 October 2026". |
| Tombol musik | Menyalakan dan mematikan; ikon dan `aria-pressed` mengikuti hasil playback nyata. |
| "Buka di Maps" | Tautan nyata ke `maps.app.goo.gl`, `target="_blank" rel="noopener"`. |
| Kirim RSVP (valid) | 201, entri muncul di daftar, panel terima kasih tampil, formulir dikosongkan. |
| Kirim RSVP (kedua, cepat) | 429, pesan "Mohon tunggu sebentar sebelum mengirim lagi", isian tetap terjaga. |
| Kirim RSVP (kosong) | Ditolak di klien tanpa request, pesan "Nama lengkap belum diisi", fokus pindah ke `#rsvp-name`. |
| Kirim RSVP (API mati) | Pesan "Koneksi terputus. Isian Anda masih tersimpan di halaman ini", isian tetap, tombol aktif kembali, tidak ada retry otomatis. |
| Guestbook gagal dimuat | Pesan galat + tombol "Coba lagi"; setelah API hidup, klik memuat ulang daftar. |
| Salin nomor rekening (x2) | Menyalin, label berubah "Tersalin", kembali sendiri setelah 2,2 detik. |
| Gulir galeri | 13 kartu tampil, tidak ada overflow horizontal. |

## Keyboard (R-32)

Urutan Tab pada desktop setelah undangan dibuka:

```
ID -> EN -> Buka di Maps -> Nama -> Jumlah tamu -> Kehadiran (grup radio)
   -> Pesan -> Kirim RSVP -> daftar ucapan -> Salin (Andrika) -> Salin (Aliva)
   -> Tombol musik
```

Setiap perhentian memiliki indikator fokus terlihat (cincin emas `box-shadow`, atau outline
pada elemen yang mewarisi `currentColor`). Spasi pada radio "Dengan Menyesal Tidak Dapat
Hadir" benar-benar memilihnya dan melepas pilihan sebelumnya.

Dua kegagalan ditemukan dan diperbaiki:

1. **Radio kehadiran tidak dapat dijangkau keyboard.** `display: none` mengeluarkan input
   dari urutan fokus, sehingga tamu yang memakai keyboard tidak dapat memilih hadir atau
   tidak. Diganti dengan teknik sembunyi-visual yang mempertahankan fokus.
2. **Form RSVP hilang dari urutan Tab pada desktop.** GSAP memakai `autoAlpha`, yang
   menulis `visibility: hidden`, dan elemen tersembunyi tidak dapat difokus. Reveal masuk
   kini menganimasikan `opacity` saja, ditambah penangan `focusin` yang menyelesaikan
   reveal dan menggulirkan elemen ke tampilan begitu ia menerima fokus.

Keduanya juga ada pada versi produksi saat ini.

## Performa

Diukur dengan alat, viewport, dan metode yang sama untuk kedua versi: Chrome headless,
mobile 390x844 @3x dan desktop 1440x900 @2x, byte terkirim dari Network domain, tanpa cache.
Produksi tidak mengaktifkan kompresi, dan preview lokal juga tidak, sehingga perbandingan setara.

| Skenario | Produksi (25 Agu) | Refactor | Selisih |
| --- | ---: | ---: | ---: |
| Mobile, tampilan cover | 5.484.343 B | 811.315 B | −85% |
| Mobile, seluruh undangan | 13.639.621 B | 1.497.457 B | −89% |
| Desktop, tampilan cover | 5.539.330 B | 885.361 B | −84% |
| Desktop, seluruh undangan | 13.694.608 B | 1.571.503 B | −89% |

Catatan koreksi: angka "tampilan cover" pada dokumen baseline Fase 0 (1.116.911 B) adalah
penjumlahan manual atas daftar berkas yang saya pilih sendiri, bukan pengukuran peramban.
Pengukuran peramban menunjukkan produksi sebenarnya mengunduh 5,48 MB sebelum tamu menekan
tombol, karena empat potongan foto hero dimuat pada resolusi penuh di balik cover.

Dari mana penghematan datang:

- Foto galeri dan potongan hero disajikan pada ukuran tampilnya. Atribut `sizes` dikalibrasi
  dari lebar render yang diukur di peramban, bukan dikira-kira: potongan hero hanya 72–238 CSS px.
- Cover, yang menjadi LCP di ponsel, dipreload pada berkas yang sama persis dengan yang dicat.
- Tujuh dari delapan bobot Reflow Sans tidak pernah dipakai dan berhenti dikirim; satu yang
  dipakai disubset ke Latin (96 kB menjadi 53,5 kB).
- GSAP tidak diunduh sama sekali pada ponsel dan pada reduced motion (terverifikasi: 0 request).
- Aset yang ter-emit tetapi tidak dirujuk dipangkas dari `dist/` (11,94 MB per build).

Ukuran build: `dist/` 8,4 MB, HTML 43.196 B, CSS 57.778 B, JS 28.523 B + 6.902 B
(potongan motion, hanya diunduh desktop), 107 varian gambar.

Yang **belum** diukur: LCP, INP, CLS pada perangkat nyata dan jaringan nyata, serta Lighthouse.
Angka di atas adalah byte transfer, bukan Core Web Vitals. Keduanya belum diverifikasi dan
tidak boleh diklaim lulus.

## Temuan terbuka

**R-02 em dash — perlu keputusan pemilik acara.** Empat teks masih memuat `—`:

| Lokasi | Teks |
| --- | --- |
| `src/i18n/id.ts` `couple.groomNote` | "…dan terutama — pasangan yang setia." |
| `src/i18n/en.ts` `couple.groomNote` | "…and above all — a devoted partner." |
| `src/i18n/*.ts` `gallery.intro` | "…sebelum hari itu tiba — dari jalan-jalan berdua…" |
| `src/i18n/*.ts` `footer.quoteAuthor` | "— Audrey Hepburn" |
| `src/data/wedding.ts` `site.title` | "Andrika & Aliva — Wedding Invitation" |

Aturan R-02 melarangnya tanpa kecuali. Namun kelimanya adalah salinan kata-kata yang sudah
tayang, termasuk kalimat tentang mempelai pria sendiri, dan tanda pisah pada atribusi kutipan
adalah tipografi kutipan yang lazim. Mengubahnya adalah keputusan pemilik acara, bukan
keputusan teknis, sehingga **tidak diubah sepihak** dan gate ini dilaporkan FAIL.

Usulan pengganti bila disetujui: "…dan di atas segalanya, pasangan yang setia.",
"…and above all, a devoted partner.", "…sebelum hari itu tiba, dari jalan-jalan berdua…",
"Audrey Hepburn" (tanpa tanda pisah), "Andrika & Aliva · Wedding Invitation".

**Verifikasi yang belum dilakukan:** perangkat iOS dan Android nyata (Safari iOS khususnya,
untuk pemutaran audio dari klik pertama), Lighthouse, dan seluruh Fase 5–7 (staging,
deployment, observasi). Semuanya tercatat sebagai belum diverifikasi, bukan PASS.
