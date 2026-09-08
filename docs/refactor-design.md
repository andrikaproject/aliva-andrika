# Rencana per fase: refactor undangan dan deployment VPS

Tanggal: 8 September 2026.
Status: rencana pelaksanaan. Implementasi aplikasi dan perubahan VPS belum dilakukan.
Dasar keputusan: [audit Astro/Vue](2026-09-08-astro-vue-refactor-audit.md).

**Keputusan dan konteks**

- Satu undangan Andrika dan Aliva, dengan Astro static output, Tailwind compiled, dan TypeScript.
- API Node + SQLite dipertahankan. Vue tidak menjadi dependensi pada rencana utama; dapat dievaluasi kemudian jika state RSVP berkembang.
- Antislop diterapkan selama refactor, sesuai pilihan pengguna. Gunakan core yang sudah tersedia; rencana ini tidak memasang skill atau mengubah AGENTS.md.
- Domain produksi: `andrika-aliva.my.id`, sudah aktif. Docker dikonfirmasi pengguna; Ubuntu 24.04 masih perlu diverifikasi di server.
- Desain dan perilaku produksi yang telah disepakati menjadi baseline. Fokusnya mempertahankan identitas undangan sambil memperbaiki struktur, keandalan, dan pengiriman aset.
- Detail akses SSH, Compose aktif, lokasi volume, proxy, dan mekanisme rilis lama belum tersedia. Pengumpulan detail tersebut merupakan pekerjaan wajib Fase 0 sebelum menulis konfigurasi deployment final.

**Temuan produksi yang mengubah prioritas**

Pemeriksaan HTTP read-only terhadap `https://andrika-aliva.my.id/` mendapatkan status 200 dan header `Server: Caddy`. Header ini merupakan petunjuk proxy yang terlihat publik, bukan bukti lokasi Caddy atau keseluruhan topologi VPS.

HTML produksi mereferensikan `css/tailwind.css`, `css/design-system.min.css`, `css/styles.min.css`, dan `js/main.min.js`. HTML lokal masih mereferensikan Tailwind CDN, konfigurasi Tailwind browser, serta script GSAP CDN. Artinya, baseline lokal berbeda dari produksi. Audit awal menjelaskan sumber lokal; penghapusan Tailwind CDN tidak boleh diklaim sebagai optimasi baru di produksi yang sudah memakai CSS compiled.

Rilis baru harus membawa perubahan produksi yang relevan setelah source/revision-nya ditemukan. Nama file atau query versi bukan bukti commit tertentu. Jangan menjadikan file minified publik sebagai sumber utama jika source atau artefak rilis asli tersedia.

**Peta fase**

| Fase | Fokus | Hasil utama | Syarat lanjut |
| --- | --- | --- | --- |
| 0 | Baseline lokal, produksi, dan VPS | Catatan versi, topologi, data, dan perilaku | Perbedaan sumber dipahami; backup produksi tervalidasi |
| 1 | Fondasi Astro dan Tailwind | Build frontend yang dapat direproduksi | Dev, check, build, dan serving hasil build berhasil |
| 2 | Komponen, data, dan CSS | Struktur modular dengan tampilan setara | Konten, anchor, dan komposisi sesuai baseline |
| 3 | Interaksi dan kontrak API | Bahasa, cover, audio, countdown, RSVP stabil | Jalur normal dan kegagalan lulus verifikasi |
| 4 | Aset, performa, dan kualitas UI | Gambar responsif dan bukti antislop | Pemeriksaan browser dan laporan kualitas selesai |
| 5 | Packaging dan staging VPS | Kandidat rilis teruji pada lingkungan terisolasi | Restore, restart, proxy, dan alur end-to-end lulus |
| 6 | Deployment produksi dan rollback | Domain aktif memakai rilis baru | Smoke test publik lulus; data dan rollback terjaga |
| 7 | Observasi dan serah terima | Runbook serta catatan operasional | Pemantauan awal dan pemeriksaan backup selesai |

Fase dijalankan berurutan. Satu fase selesai ketika hasilnya dapat diperiksa, bukan hanya ketika file telah dibuat. Build yang sama dari Fase 5 dipromosikan pada Fase 6; perubahan kode setelah staging harus diuji kembali pada bagian yang terdampak.

**Fase 0: cocokkan baseline dan inventaris VPS**

Tujuan: menetapkan sumber yang akan direfactor dan cara mempertahankan layanan/data yang sudah berjalan.

- Catat commit lokal, perubahan aset pengguna, source/revision produksi, serta cara deployment saat ini. Lindungi perubahan lokal yang belum di-commit.
- Verifikasi OS, Docker/Compose, kapasitas disk, container, image/tag, port, network, restart policy, dan pengelola deployment yang mungkin sudah tersedia.
- Baca konfigurasi Caddy/proxy yang benar-benar aktif, document root atau web container, domain/TLS, jalur upstream API, dan mount database. Jangan menganggap volume baru dengan nama mirip akan mengarah ke data lama.
- Catat baseline mobile/desktop pada live dan lokal: screenshot, crop foto, urutan section, bahasa, query `?to=`, audio, deadline RSVP, Maps, dan gift. Cocokkan perubahan yang harus ikut migrasi.
- Ukur request/transfer awal dan ketika membuka galeri pada konfigurasi browser/jaringan yang dicatat. Pisahkan performa produksi dari performa source lokal.
- Ambil backup SQLite dengan metode konsisten seperti online backup atau `VACUUM INTO`; uji salinan pada lokasi terisolasi, termasuk integrity check dan jumlah record. Database sekarang memakai WAL, sehingga menyalin hanya file `.sqlite` saat aktif tidak menjadi prosedur backup.
- Simpan artefak frontend/image dan konfigurasi rilis lama untuk rollback. Backup data berada di luar direktori publik dan direktori rilis.

Hasil: `docs/deployment/vps-inventory.md`, catatan perbedaan lokal/produksi, baseline visual/perilaku, dan catatan backup/restore tanpa kredensial atau isi ucapan tamu.

Syarat selesai: sumber refactor jelas; rute publik sampai database dapat dijelaskan; backup dapat dibuka; source dan perubahan produksi yang relevan telah dicocokkan. Jika source produksi belum ditemukan, penyelesaian rekonsiliasi menjadi dependensi migrasi yang dapat menimpa perilaku tersebut.

**Fase 1: fondasi Astro dan Tailwind**

Tujuan: membentuk toolchain frontend yang konsisten.

- Buat package frontend, lockfile, konfigurasi Astro static, TypeScript, dan Tailwind melalui plugin Vite. Tentukan versi Node yang kompatibel dengan versi Astro yang dipilih; jangan menyamakan kebutuhan build frontend dengan batas minimum Node API lama tanpa pengecekan.
- Sediakan perintah dev, check, build, dan preview. Gunakan instalasi dari lockfile pada build bersih.
- Atur `site` produksi ke `https://andrika-aliva.my.id` dan dev proxy `/api` ke API lokal dengan database sementara.
- Pindahkan halaman awal ke Astro sambil mempertahankan kontrak DOM. Migrasikan binding inline seperti `onsubmit` ke event listener modul agar tombol tetap berfungsi.
- Pindahkan token Tailwind ke konfigurasi CSS yang sesuai. Periksa Preflight, cascade layer, default utility, dan class yang dibuat lewat JavaScript.
- Tetapkan target browser berdasarkan kebutuhan tamu. Tailwind 4 mengasumsikan browser modern; jika perangkat lebih lama dibutuhkan, keputusan versi dilakukan sebelum styling dimigrasikan penuh.

Hasil: `package.json`, lockfile, `astro.config.mjs`, `tsconfig.json`, halaman Astro awal, CSS entry, dan instruksi menjalankan proyek.

Syarat selesai: build bersih berhasil; hasil `dist/` dapat dilayani sebagai situs statis; aset valid; dev API bekerja; tidak memerlukan Tailwind compiler di browser. Jangan memakai dev server atau `astro preview` sebagai server produksi.

**Fase 2: komponen, data, dan styling**

Tujuan: setiap bagian memiliki tanggung jawab jelas tanpa mengganti identitas undangan.

- Bentuk `InvitationLayout.astro` dan komponen Cover, Hero, Verse, Couple, Schedule, Venue, RsvpGuestbook, Gift, Gallery, MusicPlayer, serta Footer.
- Pertahankan ID section dan batas wrapper animasi yang dipakai selector, anchor, serta elemen fixed. Periksa styling clone tiket saat memakai scoped CSS.
- Buat `src/data/wedding.ts` sebagai sumber fakta acara dan `gallery.ts` sebagai sumber daftar foto/crop. Pisahkan kamus ID dan EN dari fakta acara.
- Pisahkan token warna/font/spacing dari styling spesifik bagian. Pertahankan custom CSS untuk komposisi editorial dan animasi; hapus duplikasi hanya setelah penggunaan diperiksa.
- Dokumentasikan arah visual dari desain yang sudah disetujui dan produksi terkini: hero editorial, foto asli pasangan, warna hangat, dan motif tiket pembuka. Dokumen desain lama dipakai sebagai konteks; perilaku mobile yang sudah diperbaiki dalam versi terbaru tidak dikembalikan ke versi lama.

Hasil: komponen, data terstruktur, kamus bahasa, batas CSS, dan catatan alasan keputusan visual.

Syarat selesai: konten dan anchor lengkap, urutan undangan sesuai baseline, crop dan typography utama terjaga pada viewport referensi. Tampilan awal yang belum menerima JS tetap memiliki konten dasar yang bisa diakses.

**Fase 3: interaksi dan kontrak API**

Tujuan: perilaku mandiri, dapat diperiksa, dan pulih dari kegagalan yang relevan.

- Pisahkan modul locale, invitation, audio, countdown, gift, RSVP, motion, serta petals. Setiap modul menyediakan inisialisasi yang tidak menggandakan listener/timer dan cleanup bila diperlukan.
- Pertahankan pergantian ID/EN tanpa reload, personalisasi `?to=`, serta pilihan bahasa tersimpan. Jika storage tidak tersedia, gunakan default tanpa menghentikan inisialisasi undangan.
- Pemanggilan awal audio tetap langsung dari klik pengguna. Animasi yang belum dimuat tidak boleh menunda `audio.play()` atau membuat cover terkunci. Music UI mengikuti event dan hasil playback nyata.
- Tetapkan tanggal dengan offset WIB. Catat keputusan produk untuk target countdown: kode saat ini 08:30, sementara timeline akad menampilkan 08:00. Jangan memilih jam baru hanya dari dugaan.
- Bentuk state RSVP/guestbook yang eksplisit: loading, empty, ready, submitting, success, dan error. Pergantian bahasa tidak boleh menimpa status gagal menjadi kosong atau mereset isian.
- Pisahkan HTTP client dan rendering. Validasi bentuk respons, tangani timeout/pembatalan, cegah submit ganda selama pending, dan sediakan retry yang mempertahankan isian. Jangan retry POST otomatis setelah respons hilang karena server mungkin sudah menyimpan data.
- Pertahankan kontrak `GET/POST /api/guestbook`, field request, dan respons yang dipakai versi lama. Jika menambahkan error code, lakukan secara kompatibel. Pertahankan aturan pesan wajib dan tamu 1–4 sampai ada keputusan produk lain.
- Selaraskan rate limiter dengan proxy sebenarnya. Header IP harus berasal dari batas proxy terpercaya; uji header palsu dan pastikan port API tidak dapat diakses langsung dari internet.

Hasil: modul TypeScript, HTTP client, tes terarah state/waktu, serta perubahan API kecil bila diperlukan. Skema SQLite tidak perlu dimigrasikan untuk refactor ini.

Syarat selesai: cover, audio, bahasa, query tamu, countdown lintas zona, clipboard, RSVP, dan guestbook bekerja pada jalur normal maupun kegagalan. Integrasi API diuji memakai data temporer; record uji tidak dimasukkan ke guestbook produksi.

**Fase 4: aset, performa, dan antislop**

Tujuan: memperkecil pekerjaan browser sambil mempertahankan kualitas visual yang sudah dipilih.

- Pindahkan foto konten ke `src/assets`; hasilkan ukuran responsif lewat fasilitas gambar Astro. `public` hanya untuk aset yang memang perlu disalin apa adanya.
- Prioritaskan cover yang pertama terlihat dan pertahankan lazy loading galeri. Periksa `srcset`, ukuran intrinsik, crop, dan format yang benar-benar dipilih browser.
- Audit font yang dipakai dan preload audio. Terapkan pengurangan hanya ketika tidak merusak typography atau keandalan musik dari klik pertama.
- Muat GSAP hanya pada mode perangkat yang memerlukan animasi desktop. Inisialisasi terlambat membaca state undangan sudah dibuka, agar tidak kehilangan event pembukaan. Reduced motion dan kegagalan impor tetap memiliki native-scroll fallback.
- Batasi kerja dekoratif saat tab tersembunyi dan pastikan resize tidak menggandakan animation loop/ScrollTrigger.
- Jalankan pemeriksaan antislop pada viewport kecil, tablet, desktop, keyboard, dan reduced motion. Periksa kontras, target sentuh, overflow, fokus, feedback formulir, serta semua link/tombol.
- Bandingkan performa dengan baseline pada konfigurasi yang sama dan laporkan angka yang diukur. Target awal: tidak ada regresi akses konten dan kontrol penting; gambar galeri tidak lagi memakai file resolusi penuh untuk ukuran tampilan kecil. Ambang byte/timing rinci ditetapkan setelah baseline Fase 0 tersedia.

Hasil: aset responsif, pengaturan loading, catatan performa sebelum/sesudah, serta `docs/verification/antislop-report.md` dengan bukti per kontrol.

Syarat selesai: check/build lulus; browser console bebas error yang mengganggu; alur interaktif berhasil; tidak ada overflow pada viewport uji; kriteria antislop yang berlaku lolos dengan bukti. Status yang belum diuji dicatat sebagai belum diverifikasi, tidak diberi PASS.

**Penerapan antislop sepanjang fase UI**

Pembacaan desain yang akan dipakai: undangan personal untuk keluarga dan tamu, dengan hero editorial, foto asli, warna hangat, dan pembuka berbentuk tiket. Acuan dials dari desain yang sudah ada: ENERGY 3, RHYTHM 3, MOTION 3 pada desktop penuh; MOTION 2 pada mobile dan 1 pada reduced motion. Ini pembacaan arah yang perlu dicocokkan dengan baseline visual Fase 0, bukan hasil audit visual yang sudah lulus.

Catat alasan mempertahankan setiap keputusan utama: typography besar menegaskan perayaan dan nama pasangan; crop foto mendukung komposisi hero; motif tiket memberi konteks tindakan membuka undangan; motion desktop mengarahkan perjalanan membaca. Tema hangat tetap menjadi identitas undangan. Perubahan palet, ilustrasi, struktur halaman, atau penambahan theme toggle tidak diperlukan untuk migrasi teknis ini.

Laporan kualitas mencakup Hard Gate, Purpose-Gate, Liveliness, dan Craftsmanship/Quality Locks. R-03/R-25/R-32 diperiksa pada browser, R-26/R-27/R-35 dibuktikan melalui click-through serta state request, R-17/R-18/R-36/R-38 melalui sumber konten. Gunakan ambang kontras WCAG yang benar untuk ukuran dan bobot teks; teks 18 px biasa tetap dinilai sebagai teks normal.

**Fase 5: packaging dan staging di VPS**

Tujuan: menguji kandidat rilis pada topologi yang menyerupai produksi dengan isolasi data.

- Sesuaikan deployment dengan Caddy/proxy dan Docker yang ditemukan di Fase 0. Pertahankan pengelola TLS/proxy yang aktif; jangan memasang proxy kedua yang berebut port 80/443.
- Build frontend menjadi artefak `dist/` atau image static server berlabel commit. Pilih bentuk yang paling dekat dengan layanan sekarang. Build dilakukan lokal/CI yang sesuai arsitektur target, atau builder terisolasi, agar proses optimasi gambar tidak mengganggu layanan live.
- Jika memakai web container, static server internal melayani hasil build; API berjalan sebagai service terpisah. Compose menamai network/volume secara eksplisit dan mengacu ke resource produksi yang telah diverifikasi, bukan mengandalkan nama project dari folder.
- Siapkan staging dengan nama project/network/volume sendiri, berisi data uji yang jelas. Akses melalui tunnel atau hostname staging yang disiapkan pada proxy; API staging tidak boleh menunjuk database produksi.
- Uji pola same-origin: `/` dan aset menuju static server, `/api/guestbook` menuju API dengan path utuh. API yang gagal tidak boleh berubah menjadi respons HTML fallback 200.
- Konfigurasi environment server melalui mekanisme deploy, terpisah dari bundle publik. Hanya domain dan konfigurasi publik yang boleh masuk frontend.
- Periksa akses langsung port API, permission volume, restart policy, healthcheck, batas body request, timeout, dan rotasi log. `/healthz` yang sekarang mengembalikan `ok` tidak sendirian membuktikan query SQLite berhasil; tambahkan pemeriksaan read API dalam smoke test.
- Tetapkan cache: HTML revalidate/pendek, aset berhash boleh cache panjang, respons guestbook tidak di-cache. Aset lama yang berhash tetap tersedia selama masa transisi agar tab lama tidak gagal saat lazy load.
- Uji backup/restore pada volume terisolasi, recreation container, serta alur RSVP end-to-end melalui proxy staging. Jangan menguji hapus volume pada resource produksi.

Hasil: konfigurasi deploy yang cocok dengan VPS aktual, artefak/image beridentitas rilis, environment example tanpa rahasia, runbook staging, dan log hasil verifikasi.

Syarat selesai: kandidat rilis yang sama berhasil melayani HTML/aset/API; data staging tetap ada setelah container dibuat ulang; restore teruji; produksi tidak menerima data uji. Konfigurasi domain/TLS untuk produksi sudah dapat ditinjau.

**Topologi target**

```text
Browser tamu
  https://andrika-aliva.my.id
           |
    Caddy/proxy yang aktif
           |
           +-- / dan aset ----------> static server: hasil build Astro
           |
           +-- /api/guestbook ------> Node API:4000 (internal)
                                         |
                                     /data/rsvp.sqlite
                                     storage persisten
                                         |
                                     backup konsisten
                                     di luar web root
```

Static server dapat berupa layanan yang sudah ada atau container internal. Letak Caddy di host/container dan jaringan aktual diputuskan dari inventaris, tanpa mengubah arsitektur aplikasi di atas. Volume database terpisah dari artefak rilis, sehingga pergantian frontend tidak mengganti data RSVP.

**Fase 6: deployment produksi dan rollback**

Tujuan: memindahkan domain aktif ke kandidat yang sudah lulus staging.

1. Catat identitas rilis lama dan baru, konfigurasi proxy, volume yang akan dipakai, serta backup terbaru. Periksa ruang disk dan integritas backup. Siapkan aset berhash rilis sebelumnya untuk masa transisi.
2. Upload/pull artefak kandidat yang sudah diuji. Jika deployment mendukungnya, jalankan static candidate pada upstream internal terpisah dan uji sebelum mengganti route.
3. Pertahankan API dan volume produksi jika tidak ada perubahan backend. Jika API berubah, deploy secara terpisah dengan kontrak kompatibel; model satu instance dapat mengalami jeda singkat saat restart. Jangan menjanjikan zero downtime tanpa mekanisme yang benar-benar diuji.
4. Validasi konfigurasi proxy menggunakan tooling yang sesuai instalasi, lalu lakukan reload terkontrol atau pergantian target release. DNS tetap sama jika domain sudah menuju VPS yang benar.
5. Verifikasi HTTPS, redirect HTTP, metadata dan URL OG absolut, aset/font/audio, `?to=`, bahasa, serta pembukaan undangan pada perangkat target. Periksa API read dan log request/error; jangan menambahkan ucapan fiktif ke produksi untuk smoke test.
6. Konfirmasi data RSVP yang sebelumnya ada masih dapat dibaca dan identitas release yang terlayani sesuai kandidat. Bukti write berasal dari uji staging; keberhasilan write produksi dipantau dari pengiriman nyata berikutnya tanpa mengekspos isi pesan pada log teknis.
7. Jika halaman tidak dapat dibuka, aset penting gagal, atau API mengalami kegagalan baru setelah cutover, kembalikan upstream/artefak frontend lama. Jika masalah berasal dari API baru, kembalikan image API lama yang telah terbukti kompatibel dengan skema yang tetap.

Rollback kode harus mempertahankan database terkini. Jangan memulihkan snapshot database lama sebagai langkah rollback rutin karena akan menghapus RSVP yang masuk setelah backup. Restore data hanya untuk insiden data dengan prosedur tersendiri dan perhitungan selisih record.

Hasil: `andrika-aliva.my.id` melayani versi refactor, catatan rilis dan smoke test publik, serta perintah rollback yang sudah diuji di staging.

Syarat selesai: domain, aset, interaksi, read API, dan data lulus pemeriksaan pascadeploy; rilis lama masih tersedia. Cache/proxy tidak menyajikan HTML dari rilis berbeda dengan aset yang tersedia.

**Fase 7: observasi dan serah terima**

Tujuan: proyek dapat dipelihara setelah deployment selesai.

- Pantau periode awal pascarilis dan tinjau lagi pada hari berikutnya: respons HTTP/API, error aplikasi, restart container, disk/volume, dan hasil backup.
- Gunakan kebijakan awal yang dicatat: backup harian dan sebelum rilis, simpan setidaknya tujuh backup harian dan dua rilis aplikasi terakhir. Sesuaikan kapasitas/retensi pada inventaris VPS. Backup eksternal menggunakan lokasi yang benar-benar tersedia; salinan pada VPS yang sama tidak dianggap perlindungan terhadap hilangnya VPS.
- Dokumentasikan lokasi konfigurasi, cara mengganti isi undangan/foto, build, deploy, membaca log, backup, restore, dan rollback. Jangan mencatat password/private key di repo.
- Catat siapa yang menjalankan pengecekan setelah deploy dan bagaimana status gagal terlihat. Alert keluar melalui layanan pesan hanya dikonfigurasi ketika tujuannya telah ditentukan dan pengiriman diotorisasi.
- Bersihkan resource staging hanya setelah bukti verifikasi disimpan, memakai nama resource yang sudah dipastikan. Hindari operasi prune global yang dapat menyentuh layanan VPS lain.

Hasil: README operasional, runbook deploy/rollback/backup, catatan versi dan pengukuran, serta daftar tanggung jawab pemeliharaan.

Syarat selesai: operator dapat menjalankan rilis ulang dan pemulihan menggunakan runbook; pemeriksaan awal selesai; backup berjalan dan hasilnya dapat diverifikasi. Pemantauan berkelanjutan setelah serah terima menjadi operasi rutin.

**Definisi selesai keseluruhan**

Refactor selesai setelah source modular dapat dibangun ulang dari lockfile, tampilan/interaksi yang disepakati lulus verifikasi, hasil build telah terpasang pada domain produksi, data RSVP dipertahankan, backup/rollback teruji, dan hasil pemeriksaan tercatat. Dokumen rencana ini tidak menyatakan build, antislop UI, staging, atau deployment sudah lulus.

**Referensi teknis**

- [Docker Compose pada produksi](https://docs.docker.com/compose/how-tos/production/): konfigurasi layanan dan deployment di satu server.
- [Docker volumes](https://docs.docker.com/engine/storage/volumes/): penyimpanan data di luar lifecycle container.
- [SQLite Online Backup](https://sqlite.org/backup.html): snapshot konsisten database aktif.
- [Astro deployment](https://docs.astro.build/en/guides/deploy/): build dan deployment Astro.
- [Sumber antislop yang digunakan](/Users/andrika/.agents/skills/antislop/SKILL.md): kualitas UI selama pelaksanaan.

Dokumentasi Docker dan SQLite diperiksa langsung melalui HTTP pada sesi penyusunan. Referensi Astro/Tailwind beserta audit sumber lokal tersedia pada dokumen audit pendamping. Pemeriksaan publik domain hanya membaca halaman; akses SSH dan mutasi produksi belum dilakukan.
