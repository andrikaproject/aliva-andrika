# Audit dan usulan refactor Astro / Vue

Tanggal: 8 September 2026. Status: audit awal dan keputusan arsitektur historis.
Implementasi Astro + Tailwind + TypeScript, packaging, staging, deployment, dan runbook
kemudian diselesaikan pada branch `refactor-aliva-andrika`; bukti rilis ada di
[`docs/verification/2026-09-08-phase5-7-release.md`](verification/2026-09-08-phase5-7-release.md).
Konteks yang dikonfirmasi: tetap satu undangan Andrika–Aliva.

Pembaruan setelah pemeriksaan domain produksi: HTML di `andrika-aliva.my.id` memakai Tailwind compiled serta JS/CSS minified yang berbeda dari source lokal dalam audit ini. Temuan CDN di bawah berlaku untuk source lokal. Rekonsiliasi lokal/produksi menjadi Fase 0 pada [rencana refactor dan deployment VPS](2026-09-08-refactor-phases-vps.md).

**Keputusan yang direkomendasikan**

Gunakan Astro dengan output statis, Tailwind yang dikompilasi saat build, dan TypeScript untuk perilaku browser. Pertahankan API Node + SQLite yang sudah ada. Vue 3 menjadi opsi terbatas untuk satu area RSVP + guestbook jika kemudahan mengelola state formulir dianggap sepadan dengan tambahan framework.

Astro dan Vue dapat digunakan bersama. Astro mengatur halaman dan rendering; Vue dapat mengelola komponen interaktif di dalamnya. Tailwind mengatur styling dan cocok untuk kedua pilihan.

Alasan utama memilih Astro: konten undangan jarang berubah, hanya ada satu halaman, dan interaksi tidak membutuhkan navigasi aplikasi. Proyek saat ini juga sudah mengirim HTML statis. Manfaat migrasi terletak pada batas komponen, build yang dapat direproduksi, pengolahan gambar, dan pembagian JavaScript; bukan klaim bahwa HTML statis baru menjadi cepat setelah memakai Astro.

**Bukti dari repositori**

| Area | Kondisi saat audit | Implikasi |
| --- | --- | --- |
| Halaman | `index.html`: 813 baris, 8 section | Pecah berdasarkan bagian undangan, pertahankan urutan dan ID anchor. |
| Perilaku | `js/main.js`: 1.419 baris | Bahasa, cover, audio, countdown, guestbook, canvas, dan GSAP memiliki tanggung jawab berbeda. |
| Styling | `css/styles.css`: 2.197 baris; `css/design-system.css`: 762 baris | Pisahkan token dan styling per bagian; jumlah baris sendiri bukan bukti bahwa CSS tidak diperlukan. |
| Build | Tidak ada `package.json` frontend, lockfile, atau konfigurasi build frontend dalam inventaris | Tambahkan toolchain dan perintah dev/build/check yang konsisten. |
| Tailwind | CDN browser di `index.html:38`; konfigurasi global di `js/tailwind.config.js` | Migrasi yang dibutuhkan adalah ke compiled Tailwind, bukan mulai memakai Tailwind. |
| Dependensi animasi | GSAP, ScrollTrigger, ScrollSmoother dimuat lewat script CDN di akhir HTML | Ketiganya tetap diunduh pada perangkat yang kemudian memilih native scroll. |
| Backend | `api/server.js`: 244 baris; Node HTTP + `node:sqlite`, Docker terpisah | Tidak perlu mengganti backend untuk mengganti frontend. |
| Galeri | 13 foto, lazy loading, tanpa filter aktif | Komponen Astro dengan data galeri sudah cukup; tidak ada kebutuhan Vue carousel yang perlu diciptakan. |

Ukuran di bawah adalah byte file lokal, memakai MB desimal. Ini bukan hasil pengukuran transfer jaringan atau LCP:

- `assets/hero/couple-portrait.webp`: 6,90 MB.
- 13 file unik yang dipakai galeri: total 29,50 MB. Salah satunya juga dipakai hero.
- Seluruh referensi lokal unik dari tag gambar/source/script/link di HTML: 40,46 MB. Angka ini tidak mencakup aset yang hanya direferensikan CSS atau dependensi eksternal, dan tidak berarti semuanya diunduh pada tampilan pertama.
- Semua file di folder assets: 91,61 MB. Besar repositori bukan besar payload halaman.

Gambar sudah memakai WebP tetapi beberapa masih berukuran 4.000–6.000 piksel. Mengganti format tanpa menyesuaikan dimensi tampil tidak cukup. Optimasi gambar adalah kandidat penghematan unduhan paling besar yang terlihat dari bukti lokal.

**Masalah yang memengaruhi rancangan**

1. `applyLocale()` di `js/main.js:194` mengganti `innerHTML` elemen terjemahan. Kamus sekarang berasal dari kode sendiri; ini bukan bukti adanya injeksi data tamu. Namun, mutasi seperti ini tidak boleh memasuki DOM milik Vue karena akan bertabrakan dengan rendering Vue. Akses localStorage juga belum memiliki penanganan kegagalan; exception saat inisialisasi bahasa dapat menghentikan script berikutnya.
2. RSVP memakai `onsubmit="handleRsvp(event)"` di `index.html:482`. Fungsi top-level di script modul Astro tidak otomatis menjadi fungsi global. Pemindahan script tanpa mengganti binding event akan merusak submit.
3. Countdown di `js/main.js:567` memakai tanggal tanpa offset. Nilai yang sama menjadi `2026-10-17T01:30:00.000Z` di Jakarta dan `2026-10-17T08:30:00.000Z` di UTC. Target countdown juga 08:30, sementara timeline akad menampilkan 08:00 dan kartu acara menampilkan rentang 07:00–10:00. Offset wajib eksplisit; pilihan momen countdown perlu diselaraskan dengan pemilik acara sebelum rilis.
4. Cover memulai audio langsung dari klik pengguna dan membagikan hasilnya ke music player. Pertahankan urutan ini. Jangan menaruh `await import(...)` sebelum pemanggilan `audio.play()` yang pertama.
5. GSAP memegang selector dan wrapper global. Pemecahan file dapat mengubah selector, urutan inisialisasi, atau styling clone tiket. Pertahankan kontrak DOM pada tahap awal; uji clone yang dipasang dinamis jika styling dipindah ke scoped CSS.
6. Guestbook fetch berjalan saat script awal dieksekusi meskipun RSVP berada jauh di bawah. Loading, empty, error, dan entries masih dikelola terpisah. `localechange` memanggil render daftar, sehingga status gagal dapat berubah menjadi status kosong ketika entries belum ada. Model state eksplisit menghindari masalah ini.
7. API mengirim pesan error berbahasa Inggris, dan frontend memprioritaskan `result.error` di atas terjemahan lokal. Petakan error terstruktur/status ke pesan ID/EN di frontend.
8. `og:image` masih relatif (`index.html:20`). Rancangan build perlu domain produksi untuk menghasilkan URL gambar absolut dan metadata berbagi yang konsisten.
9. Rate limiter mempercayai `X-Forwarded-For` langsung. Tes lokal membuktikan header berbeda melewati batas IP yang sama. Risiko produksi bergantung pada apakah proxy menimpa header tersebut dan menutup akses langsung ke API; konfigurasi proxy tidak tersedia di repositori.

Hal baik yang dipertahankan: query SQL memakai parameter, data guestbook dirender dengan `textContent`, body request dan panjang teks dibatasi, ada respons rate limit, fallback animasi, reduced motion, dan native scroll untuk perangkat sentuh. Refactor tidak perlu menulis ulang semua ini.

**Perbandingan tiga pilihan**

| Pertimbangan | Astro + Tailwind + TS | Astro + Tailwind + Vue islands | Vue + Vite + Tailwind |
| --- | --- | --- | --- |
| Konten undangan | HTML statis saat build | HTML statis; Vue hanya di area terpilih | SPA biasa merender konten lewat JS; prerender adalah tambahan |
| Form dan guestbook | State dan DOM dikelola modul kecil | Reactive state dan template Vue lebih nyaman | Reactive state tersedia untuk seluruh halaman |
| Bahasa tanpa reload | Modul locale bersama | Perlu penghubung locale ke island | Satu pohon reaktif menyederhanakan perubahan bahasa |
| Audio dan GSAP | Cocok dengan API DOM yang sekarang | Perlu pembagian kepemilikan DOM | Tetap perlu refs, lifecycle, dan cleanup |
| Biaya migrasi relatif | Terendah: HTML dan perilaku dapat dipindah bertahap | Sedang: dua model komponen dan hydration | Tertinggi untuk kondisi ini: hampir seluruh markup/perilaku dipetakan ulang |
| JS framework browser | Tidak memerlukan runtime UI framework | Vue runtime dimuat ketika island perlu aktif | Vue runtime diperlukan untuk aplikasi |
| Cocok untuk satu undangan | Paling sesuai | Masuk akal bila pengembang ingin memakai Vue | Bisa berjalan, tetapi manfaat aplikasi menyeluruh belum terpakai |

Ini perbandingan arsitektur, bukan benchmark. Vue sendiri mendukung progressive enhancement, SSR, dan SSG; keterbatasan SPA bukan keterbatasan mutlak Vue. Nuxt prerender dapat menghasilkan HTML awal juga. Namun, kebutuhan satu undangan ini belum memberi alasan untuk menambah stack aplikasi tersebut. Metadata statis juga dapat dipasang pada SPA; jangan menyimpulkan preview WhatsApp pasti gagal hanya karena memakai Vue.

**Rancangan yang direkomendasikan**

Struktur berikut adalah target, bukan daftar file yang sudah dibuat:

```text
src/
  pages/index.astro
  layouts/InvitationLayout.astro
  components/
    Cover.astro
    Hero.astro
    Verse.astro
    Couple.astro
    Schedule.astro
    Venue.astro
    RsvpGuestbook.astro
    Gift.astro
    Gallery.astro
    MusicPlayer.astro
    Footer.astro
  data/
    wedding.ts
    gallery.ts
  i18n/
    id.ts
    en.ts
  scripts/
    locale.ts
    invitation.ts
    audio.ts
    countdown.ts
    rsvp.ts
    gift.ts
    motion.ts
    petals.ts
  lib/guestbook-api.ts
  styles/
    global.css
    tokens.css
  assets/photos/
public/
  audio/
  fonts/
  social/
api/
  server.js
  Dockerfile
  package.json
astro.config.mjs
package.json
```

`wedding.ts` menjadi sumber nama, venue, URL Maps, rekening, deadline RSVP, jadwal, dan target countdown dengan offset `+07:00`. `gallery.ts` berisi import foto, alt, serta kebutuhan crop. Jam acara dan target countdown merupakan field berbeda jika maknanya memang berbeda. Kamus bahasa berisi teks, bukan salinan fakta acara yang mudah berbeda sendiri.

Render HTML awal dalam Bahasa Indonesia. Pertahankan tombol ID/EN tanpa reload, localStorage, dan parameter `?to=`. Modul locale menyediakan pembacaan locale saat ini dan subscription; penulis DOM statis hanya menangani elemen miliknya. Gunakan text node untuk teks biasa; markup kaya dibentuk lewat template/elemen yang jelas. Kegagalan storage harus kembali ke default dan tidak memblokir pembukaan undangan.

`invitation.ts` menangani cover dan status dibuka. `audio.ts` menangani satu elemen audio dan state playback. Countdown dan tombol salin memakai DOM API biasa. `rsvp.ts` menangani state request dan rendering, sedangkan `guestbook-api.ts` menangani HTTP serta validasi bentuk respons. Pemisahan ini cukup tanpa router, Pinia, CMS, atau lapisan multi-tenant.

GSAP tetap tersedia untuk desktop sesuai desain saat ini, tetapi impor dapat ditunda sampai perangkat memenuhi kriteria. Inisialisasi yang terlambat harus membaca status undangan sudah dibuka, bukan hanya menunggu event yang mungkin sudah lewat. Gunakan fallback native scroll jika impor atau setup gagal. Loop canvas, timer, observer, dan listener memiliki cleanup; hentikan pekerjaan dekoratif saat dokumen tersembunyi. Hindari menambah client-side page transitions pada tahap ini karena akan menambah persoalan lifecycle dan audio tanpa kebutuhan navigasi.

Gambar konten masuk `src/assets` dan digunakan melalui fasilitas image Astro dengan ukuran responsif. Menaruh semua foto ke `public` hanya akan menyalinnya tanpa optimasi. Cover yang pertama terlihat mendapat prioritas; galeri tetap lazy. Evaluasi preload audio dan jumlah font yang benar-benar digunakan melalui pengukuran jaringan, sambil menjaga musik dapat mulai saat klik.

Gunakan Tailwind 4 melalui `@tailwindcss/vite` dan token CSS melalui `@theme`/pemetaan variabel yang sesuai. Custom CSS tetap dipakai untuk crop editorial, ticket tear, dan animasi. Audit perubahan Preflight, token warna, default utility, deteksi class dalam JS/Vue, dan cascade layer; hasil visual tidak otomatis identik setelah mengganti versi Tailwind. Class dinamis harus memakai mapping string lengkap yang dapat dideteksi build.

Tailwind 4 menetapkan browser dasar Chrome 111, Safari 16.4, dan Firefox 128. Rekomendasi ini mengasumsikan browser modern tersebut. Jika daftar tamu membutuhkan perangkat lebih lama, pilih versi styling yang mendukung target dan audit fitur CSS kustom juga; mengganti versi Tailwind saja tidak menjamin seluruh halaman kompatibel.

**Jika Vue dipilih**

Ganti hanya `RsvpGuestbook.astro` menjadi island `RsvpGuestbook.vue`, dengan subkomponen `RsvpForm.vue` dan `GuestbookList.vue`. Satu island menampung form, state loading/error/success, dan daftar agar hasil POST langsung memperbarui daftar melalui state yang sama.

Gunakan `client:visible` dengan margin untuk memulai hydration sebelum area terlihat; selama belum siap, kontrol submit harus menampilkan status persiapan dan tidak melakukan submit native yang salah. Jika keterlambatan ini terasa pada navigasi langsung ke `#rsvp`, gunakan `client:load` berdasarkan pengujian, bukan mempertahankan lazy hydration sebagai tujuan tersendiri. Jangan memakai `client:only` tanpa kebutuhan karena HTML awal tetap berguna.

Island merender locale default yang sama dengan server, lalu membaca snapshot locale browser saat mount dan berlangganan perubahan. Ini menangani pengguna yang sudah mengganti bahasa sebelum island aktif. Modul locale global tidak boleh mengganti `innerHTML` di dalam root island. Bersihkan subscription dan request dengan unmount/AbortController.

Vue memberi manfaat nyata pada kode form dan daftar. Namun, menambahkan Vue hanya untuk countdown, salin rekening, atau tombol musik tidak sepadan untuk lingkup saat ini. Menjadikan seluruh undangan satu island Vue akan mengurangi manfaat pemilihan hydration per bagian yang menjadi alasan memakai Astro.

**Backend dan deployment**

Frontend dibangun menjadi `dist/` dan dilayani sebagai file statis. Browser tetap mengakses `GET/POST /api/guestbook` pada origin yang sama. Proxy produksi meneruskan `/api/*` ke Node; dev server memakai proxy lokal yang setara. Konfigurasi host aktual perlu diisi pada tahap implementasi karena tidak ditemukan di repositori.

Pertahankan SQLite dalam persistent volume `/data` dan satu instance penulis untuk lingkup undangan ini. Pastikan backup/restore tersedia. Hosting frontend statis tidak menjalankan API atau menyimpan SQLite secara otomatis. Memindahkan API ke endpoint Astro yang berjalan per request tetap membutuhkan runtime dan penyimpanan persisten; tidak memberikan manfaat jelas pada refactor awal.

Pertahankan kontrak request `name`, `message`, `attendance`, `guests` dan respons `entries`/`entry`. Pesan saat ini wajib, jumlah tamu 1–4, termasuk ketika tidak hadir; ubah aturan tersebut hanya sebagai keputusan produk tersendiri. Tutup akses langsung ke API jika proxy menjadi sumber IP terpercaya. Framework frontend tidak memperbaiki aturan backend dengan sendirinya.

**Urutan migrasi dan bukti penerimaan**

1. Catat baseline tampilan dan perilaku: mobile/desktop, ID/EN, `?to=`, cover, musik, countdown, Maps, gift, dan RSVP. Simpan baseline request jaringan agar hasil optimasi dapat dibandingkan.
2. Tambahkan Astro dan compiled Tailwind. Pindahkan markup ke komponen dengan ID/class yang sama, ganti inline handler dengan listener modul, dan pastikan build serta preview bekerja.
3. Pisahkan data dan modul interaksi; perbaiki offset waktu dan state bahasa/guestbook. Validasi target countdown bersama pemilik acara sebelum rilis.
4. Proses gambar responsif, periksa font/audio, dan tunda GSAP sesuai perangkat. Bandingkan hasil jaringan dan tampilan pada konfigurasi yang sama.
5. Bila Vue dipilih, migrasikan satu area RSVP + guestbook setelah kontrak API stabil. Bagian undangan lain tidak perlu ikut dipindah.
6. Verifikasi hasil build dan rute `/api` pada preview yang menyerupai produksi. Rilis frontend setelah smoke test API dan pengecekan visual, dengan artefak frontend lama tersedia untuk rollback.

Kriteria selesai: tampilan utama terjaga; cover dan musik bekerja pada Safari iOS serta Android; reduced motion dan fallback GSAP bekerja; bahasa konsisten termasuk setelah request gagal; countdown sama lintas zona waktu; form menangani validasi, pending, 429, server gagal, dan sukses; data bertahan setelah restart; foto responsif terpilih sesuai viewport; metadata gambar memakai URL absolut. Jika JS gagal, konten dasar tidak boleh terkunci selamanya di balik cover, sementara kontrol yang memang memerlukan JS memberi keterangan yang jelas.

Jalankan typecheck/build, tes terarah untuk kalkulasi countdown dan state RSVP/locale, integrasi API memakai database sementara, serta pemeriksaan browser pada viewport kecil dan desktop. Nilai LCP/INP/CLS dan ukuran transfer dilaporkan dari pengukuran, bukan dari nama framework.

**Verifikasi yang sudah dilakukan pada audit**

- Inventaris file, ukuran aset, source code, dokumen desain terdahulu, dan lima commit terakhir.
- `node --check js/main.js` dan `node --check api/server.js` lulus pada Node v24.19.0.
- API dijalankan lokal dengan database temporer: GET awal 200, POST valid 201, pengiriman berulang 429, attendance invalid 422, data terbaca kembali setelah restart. Database produksi tidak dipakai.
- Uji IP header dan perbedaan parsing tanggal Jakarta/UTC seperti dijelaskan di atas.
- Belum menjalankan audit visual browser, Lighthouse, atau pengukuran perangkat nyata. Konfigurasi deployment produksi dan target browser tamu belum tersedia.
- Working tree awal berisi perubahan aset milik pengguna; perubahan tersebut tidak disentuh oleh audit ini.

**Referensi resmi yang diperiksa**

- [Astro islands](https://docs.astro.build/en/concepts/islands/): HTML statis dan hydration komponen terpilih.
- [Integrasi Vue 3 di Astro](https://docs.astro.build/en/guides/integrations-guide/vue/): rendering dan hydration Vue.
- [Cara menggunakan Vue](https://vuejs.org/guide/extras/ways-of-using-vue.html): SPA, SSR, SSG, dan penggunaan Vue di Astro.
- [Tailwind untuk Astro](https://tailwindcss.com/docs/installation/framework-guides/astro): plugin Vite dan import CSS.
- [Kompatibilitas Tailwind](https://tailwindcss.com/docs/compatibility): browser dasar Tailwind 4.
- [Gambar di Astro](https://docs.astro.build/en/guides/images/): pemrosesan gambar lokal dan batas folder public.

Layanan pencarian web mengembalikan HTTP 405. Halaman resmi di atas berhasil diambil langsung melalui HTTP untuk memverifikasi rekomendasi teknis.
