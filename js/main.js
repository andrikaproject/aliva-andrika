// ── Language switching ─────────────────────────────────────────
const TRANSLATIONS = {
  id: {
    coverTitle: 'Pernikahan',
    saveTheDate: 'Tandai Tanggal Bahagia Kami',
    coverDate: '17 Oktober 2026',
    openInvitation: 'Buka Undangan',
    weddingCelebration: 'PERAYAAN PERNIKAHAN / 2026',
    celebrating: 'MERAYAKAN',
    theWedding: 'PERNIKAHAN',
    ofAndrikaAnd: 'ANDRIKA DAN',
    scrollForMore: 'GULIR UNTUK INFORMASI LEBIH LANJUT',
    heroTagline: 'Merayakan babak baru bersama orang-orang yang kami cintai.',
    saveTheDateUpper: 'SIMPAN TANGGALNYA',
    verseTranslation: '“Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda bagi kaum yang berpikir.”',
    twoHearts: 'Dua Hati, Satu Cerita',
    coupleIntro: 'Kenali dua insan di balik perayaan ini.',
    theGroom: 'Mempelai Pria',
    groomBio: 'Putra Bapak Dodi Suwardi &amp; Ibu Sari Yagustia Rini.<br />Seorang pemimpi, pembangun, dan terutama — pasangan yang setia.',
    theBride: 'Mempelai Wanita',
    brideBio: 'Putri Bapak Triyono &amp; Ibu Rinarsih.<br />Penuh kelembutan, tawa, dan cinta yang tak tergoyahkan.',
    coupleQuote: '“Mereka menemukan satu sama lain bukan hanya sebagai pasangan, tetapi juga sebagai rumah.”',
    ourStory: 'Kisah Kami',
    storyInFrames: 'Kisah kami dalam bingkai',
    galleryIntro: 'Sekelumit perjalanan kami sebelum hari itu tiba — dari jalan-jalan berdua sampai potret di studio.',
    galPhotoCount: '{count} foto',
    galAll: 'Semua',
    galJourney: 'Perjalanan',
    galPortraits: 'Potret',
    galUmbrella: 'Di bawah payung warna-warni',
    galStudioFloor: 'Dekat dan hangat',
    galRedArch: 'Tawa di gerbang merah',
    galToriiWalk: 'Menyusuri seribu gerbang',
    galStudioSeated: 'Duduk berdampingan',
    galWisteria1: 'Di bawah kanopi bunga',
    galOverlook: 'Sudut pandang terbaik',
    galStudioCloseup: 'Tertawa lepas',
    galToriiEmbrace: 'Berdua di lorong merah',
    galCorridor: 'Lorong penuh warna',
    galStudioStanding: 'Berdiri berdua',
    galRide: 'Perjalanan kecil kami',
    galWisteria2: 'Langkah pelan berdua',
    galGazebo: 'Rehat di saung bambu',
    galStudioPlay: 'Bercanda di studio',
    galToriiSmile: 'Senyum di antara gerbang',
    galTraditional: 'Balutan kebaya dan batik',
    theDate: 'Tanggal',
    saveTheDateHeading: 'Menuju Hari Bahagia Kami!!',
    friday: 'Jumat',
    saturday: 'Sabtu',
    sunday: 'Minggu',
    oct2026: 'Okt 2026',
    countingDays: 'Menghitung Hari',
    days: 'Hari',
    hours: 'Jam',
    minutes: 'Menit',
    seconds: 'Detik',
    saturdayDate: 'Sabtu, 17 Oktober 2026',
    venue: 'Lokasi',
    whereWeCelebrate: 'Tempat Kami Merayakan',
    mainVenue: 'Lokasi Utama',
    openInMaps: 'Buka di Maps',
    scheduleOfEvents: 'Rangkaian Acara',
    guestArrival: 'Kedatangan Tamu',
    lobbyWelcome: 'Lobi &amp; Penyambutan',
    sacredVows: 'Ijab Qabul',
    luncheonCelebration: 'Santap Siang &amp; Perayaan',
    photoSession: 'Sesi Foto',
    withFamilyGuests: 'Bersama Keluarga &amp; Tamu',
    farewell: 'Perpisahan',
    untilMeetAgain: 'Terima kasih, sampai bertemu kembali',
    willYouJoin: 'Maukah Hadir Bersama Kami?',
    rsvpIntro: 'Mohon konfirmasi kehadiran sebelum <strong class="font-medium text-text-rose">1 Oktober 2026</strong>.<br />Kami tak sabar merayakannya bersama Kalian.',
    thankYou: 'Terima Kasih!',
    rsvpReceived: 'RSVP Anda telah diterima. Kami menantikan kehadiran Anda.',
    fullName: 'Nama Lengkap',
    yourFullName: 'Nama lengkap Anda',
    numberOfGuests: 'Jumlah Tamu',
    attendance: 'Kehadiran',
    joyfullyAccepts: 'Dengan Senang Hati Hadir',
    regretfullyDeclines: 'Dengan Menyesal Tidak Dapat Hadir',
    messageForCouple: 'Pesan untuk Mempelai',
    optional: '(opsional)',
    warmWish: 'Tulis doa atau pesan hangat…',
    sendRsvp: 'Kirim RSVP',
    nowPlaying: 'Sedang Diputar',
    footerQuote: '“Hal terbaik untuk dipertahankan dalam hidup adalah satu sama lain.”',
    guestGreeting: 'Kepada {name} &amp; Pasangan'
  },
  en: {
    coverTitle: 'The Wedding Of',
    saveTheDate: 'Save The Date!',
    coverDate: '17 October 2026',
    openInvitation: 'Open Invitation',
    weddingCelebration: 'WEDDING CELEBRATION / 2026',
    celebrating: 'CELEBRATING',
    theWedding: 'THE WEDDING',
    ofAndrikaAnd: 'OF ANDRIKA AND',
    scrollForMore: 'SCROLL FOR MORE INFORMATION',
    heroTagline: 'Celebrating a new chapter with the people we love.',
    saveTheDateUpper: 'SAVE THE DATE',
    verseTranslation: '“And among His signs is that He created for you mates from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy. Indeed in that are signs for a people who give thought.”',
    twoHearts: 'Two Hearts, One Story',
    coupleIntro: 'Meet the two people at the heart of this celebration.',
    theGroom: 'The Groom',
    groomBio: 'Son of Mr. Dodi Suwardi &amp; Mrs. Sari Yagustia Rini.<br />A dreamer, a builder, and above all — a devoted partner.',
    theBride: 'The Bride',
    brideBio: 'Daughter of Mr. Triyono &amp; Mrs. Rinarsih.<br />Full of grace, laughter, and an unwavering spirit of love.',
    coupleQuote: '“They found in each other not just a partner, but a home.”',
    ourStory: 'Our Story',
    storyInFrames: 'Our story in frames',
    galleryIntro: 'A few moments from before the day itself — from wandering together to portraits in the studio.',
    galPhotoCount: '{count} photos',
    galAll: 'All',
    galJourney: 'Journey',
    galPortraits: 'Portraits',
    galUmbrella: 'Beneath the parasols',
    galStudioFloor: 'Close and warm',
    galRedArch: 'Laughter at the red arch',
    galToriiWalk: 'A thousand gates',
    galStudioSeated: 'Side by side',
    galWisteria1: 'Under the flower canopy',
    galOverlook: 'The best vantage point',
    galStudioCloseup: 'Unguarded laughter',
    galToriiEmbrace: 'Together in the corridor',
    galCorridor: 'A corridor full of colour',
    galStudioStanding: 'Standing together',
    galRide: 'Our little ride',
    galWisteria2: 'Slow steps together',
    galGazebo: 'Resting in the bamboo hut',
    galStudioPlay: 'Playing around',
    galToriiSmile: 'A smile among the gates',
    galTraditional: 'In kebaya and batik',
    theDate: 'The Date',
    saveTheDateHeading: 'Save the Date!!',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    oct2026: 'Oct 2026',
    countingDays: 'Counting the Days',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    saturdayDate: 'Saturday, 17 October 2026',
    venue: 'Venue',
    whereWeCelebrate: 'Where We Celebrate',
    mainVenue: 'Main Venue',
    openInMaps: 'Open in Maps',
    scheduleOfEvents: 'Schedule of Events',
    guestArrival: 'Guest Arrival',
    lobbyWelcome: 'Lobby &amp; Welcome',
    sacredVows: 'The Sacred Vows',
    luncheonCelebration: 'Luncheon &amp; Celebration',
    photoSession: 'Photo Session',
    withFamilyGuests: 'With Family &amp; Guests',
    farewell: 'Farewell',
    untilMeetAgain: 'Thank you, until we meet again',
    willYouJoin: 'Will You Join Us?',
    rsvpIntro: 'Kindly confirm your attendance by <strong class="font-medium text-text-rose">1 October 2026</strong>.<br />We can’t wait to celebrate with you.',
    thankYou: 'Thank You!',
    rsvpReceived: 'Your RSVP has been received. We look forward to seeing you.',
    fullName: 'Full Name',
    yourFullName: 'Your full name',
    numberOfGuests: 'Number of Guests',
    attendance: 'Attendance',
    joyfullyAccepts: 'Joyfully Accepts',
    regretfullyDeclines: 'Regretfully Declines',
    messageForCouple: 'Message for the Couple',
    optional: '(optional)',
    warmWish: 'Leave a warm wish or message…',
    sendRsvp: 'Send RSVP',
    nowPlaying: 'Now Playing',
    footerQuote: '“The best thing to hold onto in life is each other.”',
    guestGreeting: 'Dear {name} &amp; Partner'
  }
};

let currentLocale = 'id';

function getTranslation(key, values = {}) {
  const template = TRANSLATIONS[currentLocale][key] || TRANSLATIONS.en[key] || key;
  return Object.entries(values).reduce((result, [name, value]) => result.replace(`{${name}}`, value), template);
}

function applyLocale(locale) {
  currentLocale = TRANSLATIONS[locale] ? locale : 'id';
  document.documentElement.lang = currentLocale;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.innerHTML = getTranslation(element.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', getTranslation(element.dataset.i18nPlaceholder));
  });

  document.querySelectorAll('.language-btn').forEach((button) => {
    const isActive = button.dataset.locale === currentLocale;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const switcher = document.getElementById('language-switcher');
  if (switcher) switcher.setAttribute('aria-label', currentLocale === 'id' ? 'Pilih bahasa' : 'Choose language');
  localStorage.setItem('wedding-locale', currentLocale);
  document.dispatchEvent(new CustomEvent('localechange', { detail: currentLocale }));
}

(function initLanguage() {
  const savedLocale = localStorage.getItem('wedding-locale');
  document.querySelectorAll('.language-btn').forEach((button) => {
    button.addEventListener('click', () => applyLocale(button.dataset.locale));
  });
  applyLocale(savedLocale || 'id');
})();

// ── Motion preference (shared) ─────────────────────────────────
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MUSIC_START_SECONDS = 14;
const MUSIC_LOOP_END_SECONDS = 107;
const MUSIC_CROSSFADE_MS = 1800;
const MUSIC_FADE_IN_MS = 1800;

function primeMusicStart(audio) {
  if (!audio || audio.dataset.startPositionApplied === 'true') return;

  const seekToOpening = () => {
    if (audio.dataset.startPositionApplied === 'true') return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    try {
      audio.currentTime = Math.min(MUSIC_START_SECONDS, Math.max(0, audio.duration - 0.1));
      audio.dataset.startPositionApplied = 'true';
    } catch {
      // The browser may defer seeking until metadata is fully available.
    }
  };

  if (audio.readyState >= 1) seekToOpening();
  if (audio.dataset.startPositionApplied !== 'true') {
    audio.addEventListener('loadedmetadata', seekToOpening, { once: true });
  }
}

function playMusicSmoothly(audio) {
  if (!audio) return null;

  const shouldFadeIn = audio.paused;
  if (shouldFadeIn) {
    cancelAnimationFrame(audio.__musicFadeFrame || 0);
    audio.volume = REDUCED_MOTION ? 1 : 0;
  }

  const playPromise = audio.play();
  if (shouldFadeIn && playPromise && typeof playPromise.then === 'function') {
    playPromise.then(() => {
      if (REDUCED_MOTION) {
        audio.volume = 1;
        return;
      }

      const startedAt = performance.now();
      const fadeStep = (now) => {
        const progress = Math.min(1, (now - startedAt) / MUSIC_FADE_IN_MS);
        audio.volume = progress;
        if (progress < 1 && !audio.paused) {
          audio.__musicFadeFrame = requestAnimationFrame(fadeStep);
        } else {
          audio.volume = 1;
          audio.__musicFadeFrame = 0;
        }
      };
      audio.__musicFadeFrame = requestAnimationFrame(fadeStep);
    }).catch(() => {
      audio.volume = 1;
    });
  }

  return playPromise;
}


// ── COVER SCREEN + TICKET-TEAR OPENING ─────────────────────────
(function initCover() {
  const cover = document.getElementById('cover-screen');
  const btn = document.getElementById('cover-btn');
  const guestEl = document.getElementById('cover-guest');
  const bloom = document.getElementById('bloom');
  const hero = document.getElementById('hero');
  const ticket = cover.querySelector('.cover-ticket');
  const dash = cover.querySelector('.cover-ticket-dash');
  let isOpening = false;

  // Lock body scroll while cover is visible
  document.body.style.overflow = 'hidden';

  // Show guest name if ?to= param exists
  const name = new URLSearchParams(window.location.search).get('to');
  if (name) {
    const renderGuest = () => {
      guestEl.innerHTML = getTranslation('guestGreeting', { name: name.replace(/[&<>]/g, '') });
    };
    renderGuest();
    guestEl.classList.remove('hidden');
    document.addEventListener('localechange', renderGuest);
  }

  function makeTicketClone(modifier) {
    const clone = ticket.cloneNode(true);
    clone.classList.add('ticket-transition-clone', modifier);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    return clone;
  }

  function makeTearClipPaths(width, height, tearY) {
    const segments = 14;
    const topEdge = [];
    const bottomEdge = [];

    for (let index = 0; index <= segments; index += 1) {
      const x = (width / segments) * index;
      const offset = index % 2 === 0 ? -1.5 : 1.5;
      const y = tearY + offset;
      bottomEdge.push(`${x.toFixed(2)}px ${y.toFixed(2)}px`);
      topEdge.unshift(`${x.toFixed(2)}px ${y.toFixed(2)}px`);
    }

    return {
      top: `polygon(0 0, ${width.toFixed(2)}px 0, ${topEdge.join(', ')})`,
      bottom: `polygon(${bottomEdge.join(', ')}, ${width.toFixed(2)}px ${height.toFixed(2)}px, 0 ${height.toFixed(2)}px)`,
    };
  }

  function runTicketTransition() {
    if (!ticket || !dash) return false;

    const ticketRect = ticket.getBoundingClientRect();
    const dashRect = dash.getBoundingClientRect();
    const tearY = dashRect.top - ticketRect.top + dashRect.height / 2;
    const zoomScale = Math.max(
      window.innerWidth / ticketRect.width,
      window.innerHeight / ticketRect.height
    ) * 1.18;

    const stage = document.createElement('div');
    stage.className = 'ticket-transition-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.left = ticketRect.left + 'px';
    stage.style.top = ticketRect.top + 'px';
    stage.style.width = ticketRect.width + 'px';
    stage.style.height = ticketRect.height + 'px';
    stage.style.setProperty('--ticket-tear-y', tearY + 'px');
    stage.style.setProperty('--ticket-zoom-scale', zoomScale.toFixed(3));

    const topClone = makeTicketClone('ticket-transition-clone--top');
    const bottomClone = makeTicketClone('ticket-transition-clone--bottom');
    const clipPaths = makeTearClipPaths(ticketRect.width, ticketRect.height, tearY);
    topClone.style.clipPath = clipPaths.top;
    topClone.style.webkitClipPath = clipPaths.top;
    bottomClone.style.clipPath = clipPaths.bottom;
    bottomClone.style.webkitClipPath = clipPaths.bottom;
    stage.append(topClone, bottomClone);

    cover.appendChild(stage);
    cover.classList.add('ticket-transitioning');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => stage.classList.add('is-active'));
    });

    setTimeout(() => {
      if (hero) hero.classList.add('hero-emerge');
    }, 1250);

    setTimeout(() => cover.classList.add('dismissed'), 1450);

    setTimeout(() => {
      stage.remove();
      cover.remove();
    }, 1750);

    return true;
  }

  function runBloomFallback() {
    const rect = btn.getBoundingClientRect();
    bloom.style.left = (rect.left + rect.width / 2) + 'px';
    bloom.style.top = (rect.top + rect.height / 2) + 'px';
    bloom.classList.add('active');

    setTimeout(() => cover.classList.add('dismissed'), 250);
    setTimeout(() => {
      if (hero) hero.classList.add('hero-emerge');
    }, 500);
    setTimeout(() => {
      cover.remove();
      bloom.classList.remove('active');
    }, 1400);
  }

  btn.addEventListener('click', () => {
    if (isOpening) return;
    isOpening = true;
    btn.disabled = true;

    // iOS requires audio.play() to run synchronously inside the trusted
    // click gesture. Fire it first, capture the Promise, and hand it to the
    // music player via a custom event so it can sync its UI to the outcome.
    const audio = document.getElementById('bg-audio');
    primeMusicStart(audio);
    const playPromise = playMusicSmoothly(audio);
    window.dispatchEvent(new CustomEvent('invitation-opened', { detail: { playPromise } }));

    // Unlock scroll as soon as the journey begins
    document.body.style.overflow = '';

    // Reduced motion → simple cross-fade, no bloom
    if (REDUCED_MOTION) {
      cover.classList.add('dismissed');
      cover.addEventListener('transitionend', () => cover.remove(), { once: true });
      return;
    }

    // If cloning is unavailable for any reason, retain the original bloom
    // transition rather than leaving the guest on a frozen cover.
    if (!runTicketTransition()) runBloomFallback();
  });
})();


// Change this to your actual wedding date/time
const WEDDING_DATE = new Date('2026-10-17T08:30:00');

// ── COUNTDOWN TIMER ────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-minutes').textContent = '00';
    document.getElementById('cd-seconds').textContent = '00';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('cd-days').textContent = pad(days);
  document.getElementById('cd-hours').textContent = pad(hours);
  document.getElementById('cd-minutes').textContent = pad(minutes);
  document.getElementById('cd-seconds').textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);


// ── RSVP FORM ──────────────────────────────────────────────────
function handleRsvp(e) {
  e.preventDefault();
  const form = document.getElementById('rsvp-form');
  const success = document.getElementById('rsvp-success');
  // Here you can send form data to your backend or a service like Formspree
  // For now, just show success UI
  form.style.display = 'none';
  success.style.display = 'block';
}


// ── REVEAL ON SCROLL ───────────────────────────────────────────
let revealObserver = null;

function initFallbackReveals() {
  if (revealObserver || !('IntersectionObserver' in window)) {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
    }
    return;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
}

initFallbackReveals();


// ── PETALS — depth-layered, site-wide, scroll-parallax ─────────
// Each petal has a `depth` (0 = far, 1 = near). Far petals are
// larger, softer, slower and fainter; near petals are smaller,
// crisper, faster. Positions shift subtly with scroll, scaled by
// depth, so the layers separate as you move through the story.
(function initPetals() {
  const canvas = document.getElementById('petalCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#E8C4B8', '#D4998A', '#E8D5A3', '#C9A96E', '#D4DDD0', '#9CAF98'];
  let W, H, VH, petals = [];

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const COUNT = isMobile ? 12 : 24;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    VH = H + 120;                    // virtual band, taller than viewport for seamless wrap
  }

  function makePetal(spread) {
    const depth = Math.random();     // 0 far … 1 near
    return {
      x: Math.random() * W,
      y: spread ? Math.random() * VH : -20,
      depth: depth,
      size: (Math.random() * 3 + 3) * (1.6 - depth * 0.9),   // far → larger
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 0.18 + depth * 0.65,                             // near → faster fall
      drift: (Math.random() - 0.5) * (0.15 + depth * 0.45),
      rot: Math.random() * Math.PI * 2,
      rotS: (Math.random() - 0.5) * (0.01 + depth * 0.03),
      alpha: 0.12 + depth * 0.20,                             // near → more present
      par: 0.04 + depth * 0.16,                             // scroll parallax factor
    };
  }

  function init() {
    resize();
    petals = Array.from({ length: COUNT }, () => makePetal(true));
  }

  function wrap(v, max) {
    return ((v % max) + max) % max;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const scrollY = window.scrollY || window.pageYOffset || 0;

    for (const p of petals) {
      // advance the fall + spin in virtual space
      p.y = wrap(p.y + p.speed, VH);
      p.x += p.drift;
      if (p.x < -20) p.x = W + 20;
      else if (p.x > W + 20) p.x = -20;
      p.rot += p.rotS;

      // parallax: nearer petals shift more with scroll
      const ry = wrap(p.y - scrollY * p.par, VH) - 60;

      ctx.save();
      ctx.translate(p.x, ry);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    // reduced-motion: a few faint petals, no animation loop
    ctx.clearRect(0, 0, W, H);
    for (const p of petals) {
      ctx.save();
      ctx.translate(p.x, wrap(p.y, H));
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  window.addEventListener('resize', () => {
    resize();
    if (REDUCED_MOTION) drawStatic();
  });

  init();
  if (REDUCED_MOTION) drawStatic();
  else requestAnimationFrame(frame);
})();


// ── GALLERY CATEGORY FILTER ────────────────────────────────────
// User-driven navigation, so it runs regardless of GSAP. The grid is
// CSS multi-column: hiding a card lets the columns rebalance on their
// own, and the re-entry animation covers that reflow.
(function initGalleryFilter() {
  const grid = document.getElementById('galleryGrid');
  const filters = Array.from(document.querySelectorAll('.gallery-filter'));
  if (!grid || !filters.length) return;

  const cards = Array.from(grid.querySelectorAll('.gallery-card'));
  const countEl = document.getElementById('galleryCount');
  let visibleCount = cards.length;

  // Lives in the pinned context column, so it stays readable for the
  // whole scroll and doubles as the filter's polite announcement.
  function renderCount() {
    if (countEl) countEl.textContent = getTranslation('galPhotoCount', { count: visibleCount });
  }

  // CSS columns pick a balanced column height first, then fill greedily —
  // so a set with fewer than two cards per column leaves the last column
  // empty and the grid looks left-weighted. Cap the count to keep every
  // column occupied; --gallery-columns stays the breakpoint's ceiling.
  function syncColumns() {
    const declared = parseInt(getComputedStyle(grid).getPropertyValue('--gallery-columns'), 10) || 1;
    const columns = Math.max(1, Math.min(declared, Math.ceil(visibleCount / 2)));
    grid.style.columnCount = String(columns);
  }

  function apply(category) {
    const shown = [];
    cards.forEach((card) => {
      const match = category === 'all' || card.dataset.category === category;
      card.hidden = !match;
      if (match) shown.push(card);
    });

    visibleCount = shown.length;
    syncColumns();
    renderCount();

    if (!REDUCED_MOTION) {
      shown.forEach((card, index) => {
        card.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          {
            duration: 420,
            delay: Math.min(index * 22, 260),
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'none',
          }
        );
      });
    }

    // The section's height just changed — keep pinned/scrubbed triggers honest.
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.classList.contains('is-active')) return;
      filters.forEach((other) => {
        const isActive = other === button;
        other.classList.toggle('is-active', isActive);
        other.setAttribute('aria-pressed', String(isActive));
      });
      apply(button.dataset.filter);
    });
  });

  // The breakpoint's ceiling changes on resize, so re-derive the cap.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(syncColumns, 160);
  }, { passive: true });

  document.addEventListener('localechange', renderCount);

  syncColumns();
  renderCount();
})();


// ── MUSIC PLAYER ───────────────────────────────────────────────
(function initMusicPlayer() {
  const audio = document.getElementById('bg-audio');
  const btn = document.getElementById('music-btn');
  const panel = document.getElementById('music-panel');
  const progress = document.getElementById('music-progress');
  const iconNote = document.getElementById('icon-note');
  const iconMute = document.getElementById('icon-mute');

  let isPlaying = false;

  function setUIPlaying(state) {
    isPlaying = state;
    if (state) {
      panel.classList.add('open');
      btn.classList.add('is-playing');
      iconNote.classList.remove('hidden');
      iconMute.classList.add('hidden');
    } else {
      panel.classList.remove('open');
      btn.classList.remove('is-playing');
      iconNote.classList.add('hidden');
      iconMute.classList.remove('hidden');
    }
  }

  function startPlay() {
    primeMusicStart(audio);
    playMusicSmoothly(audio).then(() => {
      setUIPlaying(true);
    }).catch(() => { });
  }

  function stopPlay() {
    cancelMusicLoopFade();
    cancelAnimationFrame(audio.__musicFadeFrame || 0);
    audio.__musicFadeFrame = 0;
    audio.pause();
    audio.volume = 1;
    setUIPlaying(false);
  }

  // Toggle button
  btn.addEventListener('click', () => {
    if (isPlaying) stopPlay(); else startPlay();
  });

  function cancelMusicLoopFade() {
    cancelAnimationFrame(audio.__musicLoopFadeFrame || 0);
    audio.__musicLoopFadeFrame = 0;
    audio.__musicLoopTransitioning = false;
  }

  function fadeInFromLoopStart(bounds) {
    audio.currentTime = bounds.start;
    audio.volume = 0;

    const startedAt = performance.now();
    const fadeIn = (now) => {
      if (audio.paused || !isPlaying) {
        cancelMusicLoopFade();
        return;
      }

      const progressRatio = Math.min(1, (now - startedAt) / MUSIC_CROSSFADE_MS);
      audio.volume = progressRatio;

      if (progressRatio < 1) {
        audio.__musicLoopFadeFrame = requestAnimationFrame(fadeIn);
      } else {
        audio.volume = 1;
        audio.__musicLoopFadeFrame = 0;
        audio.__musicLoopTransitioning = false;
      }
    };

    audio.__musicLoopFadeFrame = requestAnimationFrame(fadeIn);
  }

  function startMusicLoopTransition(bounds) {
    if (audio.__musicLoopTransitioning || audio.paused || !isPlaying) return;

    audio.__musicLoopTransitioning = true;
    const startingVolume = audio.volume;
    const remainingAudioMs = Math.max(160, (bounds.end - audio.currentTime) * 1000);
    const startedAt = performance.now();

    const fadeOut = (now) => {
      if (audio.paused || !isPlaying) {
        cancelMusicLoopFade();
        return;
      }

      const progressRatio = Math.min(1, (now - startedAt) / remainingAudioMs);
      audio.volume = startingVolume * (1 - progressRatio);

      if (progressRatio < 1) {
        audio.__musicLoopFadeFrame = requestAnimationFrame(fadeOut);
        return;
      }

      fadeInFromLoopStart(bounds);
    };

    audio.__musicLoopFadeFrame = requestAnimationFrame(fadeOut);
  }

  function getMusicLoopBounds() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return null;

    const start = Math.min(MUSIC_START_SECONDS, Math.max(0, audio.duration - 0.1));
    const end = Math.min(MUSIC_LOOP_END_SECONDS, audio.duration);
    return { start, end: Math.max(start + 0.1, end) };
  }

  function syncMusicLoopAndProgress() {
    const bounds = getMusicLoopBounds();
    if (!bounds) return;

    if (audio.currentTime >= bounds.end - MUSIC_CROSSFADE_MS / 1000) {
      startMusicLoopTransition(bounds);
    }

    const position = Math.min(bounds.end, Math.max(bounds.start, audio.currentTime));
    progress.style.width = (((position - bounds.start) / (bounds.end - bounds.start)) * 100) + '%';
  }

  // Keep playback inside the intentional 14s–1:47 segment.
  audio.addEventListener('timeupdate', syncMusicLoopAndProgress);
  audio.addEventListener('loadedmetadata', syncMusicLoopAndProgress);
  audio.addEventListener('ended', () => {
    const bounds = getMusicLoopBounds();
    if (!bounds) return;
    if (isPlaying) {
      audio.play().then(() => fadeInFromLoopStart(bounds)).catch(() => { });
    } else {
      audio.currentTime = bounds.start;
    }
  });

  // Pause/resume on tab visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
      audio.pause();
    } else if (!document.hidden && isPlaying) {
      audio.play().catch(() => { });
    }
  });

  // ── iOS-reliable autoplay ──────────────────────────────────────
  // The cover button calls audio.play() synchronously inside its click
  // (the trusted user gesture iOS requires) and hands us the resulting
  // Promise. We only mirror the UI to whether playback actually started.
  window.addEventListener('invitation-opened', (e) => {
    const playPromise = e.detail && e.detail.playPromise;
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => setUIPlaying(true))
        .catch(() => {/* blocked — widget stays available for a manual tap */ });
    } else {
      // No promise handed over (e.g. missing audio) — try once, ignore failure.
      playMusicSmoothly(audio).then(() => setUIPlaying(true)).catch(() => { });
    }
  });
})();


// ── GSAP SCROLL STORY ──────────────────────────────────────────
// Faithful adaptation of New Form Capital's interaction model:
// inertial scrolling, scroll-scrubbed editorial layers, and a pinned
// narrative chapter. Content and timing stay specific to this invitation.
function initScrollStory() {
  if (REDUCED_MOTION) return false;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const ScrollSmoother = window.ScrollSmoother;

  if (!gsap || !ScrollTrigger || !ScrollSmoother) {
    console.warn('Scroll story unavailable; using native-scroll fallbacks.');
    return false;
  }

  const animatedTargets = new Set();
  let smoother = null;
  let coupleMedia = null;
  let galleryMedia = null;

  function remember(targets) {
    gsap.utils.toArray(targets).forEach((target) => animatedTargets.add(target));
    return targets;
  }

  function setWillChange(targets, active) {
    gsap.set(targets, { willChange: active ? 'transform, opacity, filter' : 'auto' });
  }

  try {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    ScrollTrigger.config({ ignoreMobileResize: true });

    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }

    document.documentElement.classList.add('motion-enhanced');
    document.querySelectorAll('.reveal.visible').forEach((element) => element.classList.remove('visible'));

    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 0.8,
      smoothTouch: 0.15,
      effects: true,
      normalizeScroll: false,
    });

    const cover = document.getElementById('cover-screen');
    const coverIsVisible = Boolean(cover && cover.isConnected && !cover.classList.contains('dismissed'));
    smoother.paused(coverIsVisible);

    if (coverIsVisible) {
      window.addEventListener('invitation-opened', () => {
        requestAnimationFrame(() => {
          smoother.paused(false);
          smoother.scrollTo(0, false);
          ScrollTrigger.refresh();
        });

        // The torn-ticket transition changes fixed layers for 1.75s.
        // Refresh once more after it leaves the DOM.
        window.setTimeout(() => ScrollTrigger.refresh(), 1850);
      }, { once: true });
    }

    // Hero: each editorial row exits at a slightly different depth while
    // the image crops tighten, creating the layered magazine-like scroll.
    const heroTargets = remember(
      '.hero-masthead, .hero-meta, .hero-statement, .hero-scroll-cue, .hero-line, .hero-crop img'
    );

    const heroTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.75,
        invalidateOnRefresh: true,
        onToggle: (self) => setWillChange(heroTargets, self.isActive),
      },
    });

    heroTimeline
      .to('.hero-masthead', { yPercent: -70, autoAlpha: 0.15, duration: 1 }, 0)
      .to('.hero-meta', { yPercent: -38, autoAlpha: 0, duration: 0.85 }, 0)
      .to('.hero-line--celebrate', { yPercent: -24, duration: 1 }, 0)
      .to('.hero-line--happy', { yPercent: -11, duration: 1 }, 0)
      .to('.hero-line--names', { yPercent: 9, duration: 1 }, 0)
      .to('.hero-line--aliva', { yPercent: 19, duration: 1 }, 0)
      .to('.hero-crop img', { scale: 1.08, duration: 1 }, 0)
      .to('.hero-scroll-cue', { yPercent: 35, autoAlpha: 0, duration: 0.4 }, 0.56)
      .to('.hero-statement', { autoAlpha: 0.18, duration: 0.34 }, 0.66);

    // Verse: a calm, non-pinned pause between the energetic Hero and the
    // Couple chapter. Its lines enter in reading order.
    const verse = document.querySelector('#verse .reveal');
    if (verse) {
      const verseLines = remember(Array.from(verse.children));
      remember(verse);
      gsap.set(verse, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });

      gsap.timeline({
        scrollTrigger: {
          trigger: '#verse',
          start: 'top 74%',
          toggleActions: 'play none none none',
          onToggle: (self) => setWillChange(verseLines, self.isActive),
        },
      }).fromTo(verseLines,
        { autoAlpha: 0, y: 30, filter: 'blur(7px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          stagger: 0.11,
          ease: 'power3.out',
          onComplete: () => setWillChange(verseLines, false),
        }
      );
    }

    // Couple: full pinned sequence on roomy screens, shorter scrubbed flow
    // on compact screens so content never becomes trapped below the fold.
    const couple = document.getElementById('couple');
    const coupleStage = document.querySelector('.couple-stage');
    const coupleHeading = document.querySelector('.couple-heading');
    const coupleHeadingLines = coupleHeading ? Array.from(coupleHeading.children) : [];
    const groom = document.querySelector('.couple-card--groom');
    const bride = document.querySelector('.couple-card--bride');
    const quote = document.querySelector('.couple-quote');
    const coupleMotionTargets = remember([...coupleHeadingLines, groom, bride, quote].filter(Boolean));

    if (couple && coupleStage && coupleHeading && groom && bride && quote) {
      remember([coupleStage, coupleHeading]);
      gsap.set(coupleHeading, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });

      coupleMedia = gsap.matchMedia();
      coupleMedia.add({
        desktop: '(min-width: 768px) and (min-height: 700px)',
        compact: '(max-width: 767px), (max-height: 699px)',
      }, (context) => {
        const isDesktop = context.conditions.desktop;
        const distance = isDesktop
          ? Math.round(Math.min(1100, Math.max(780, window.innerHeight * 0.95)))
          : 0;
        const sideOffset = isDesktop ? 140 : 42;

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: couple,
            start: isDesktop ? 'top 10%' : 'top 78%',
            end: isDesktop ? `+=${distance}` : 'bottom 24%',
            scrub: isDesktop ? 0.85 : 0.55,
            pin: isDesktop ? coupleStage : false,
            pinSpacing: true,
            anticipatePin: isDesktop ? 1 : 0,
            invalidateOnRefresh: true,
            onToggle: (self) => setWillChange(coupleMotionTargets, self.isActive),
          },
        });

        timeline
          .fromTo(coupleHeadingLines,
            { autoAlpha: 0, y: 38, filter: 'blur(7px)' },
            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.2, stagger: 0.025, ease: 'power3.out' },
            0
          )
          .fromTo(groom,
            { autoAlpha: 0, x: -sideOffset, y: 44, rotation: -1.4, filter: 'blur(9px)' },
            { autoAlpha: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', duration: 0.29, ease: 'power3.out' },
            0.16
          )
          .fromTo(bride,
            { autoAlpha: 0, x: sideOffset, y: 44, rotation: 1.4, filter: 'blur(9px)' },
            { autoAlpha: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', duration: 0.29, ease: 'power3.out' },
            0.29
          )
          .fromTo(quote,
            { autoAlpha: 0, y: 48, filter: 'blur(8px)' },
            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.23, ease: 'power3.out' },
            0.71
          );

        return () => setWillChange(coupleMotionTargets, false);
      });
    }

    // Photo band (Figma 312:74): the rounded panel expands to fill the
    // screen on the way in and contracts on the way out, while the
    // context column stays pinned beside the scrolling photographs.
    // Only the empty .gallery-frame is animated — nothing that GSAP
    // pins sits inside it, so the pin maths stays in untransformed space.
    const band = document.getElementById('photo-band');
    const frame = band && band.querySelector('.gallery-frame');
    const galleryLayout = band && band.querySelector('.gallery-layout');
    const galleryContext = band && band.querySelector('.gallery-context__inner');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryCards = galleryGrid ? Array.from(galleryGrid.querySelectorAll('.gallery-card')) : [];

    const FRAME_INSET = '6%';
    const FRAME_RADIUS = 56;

    if (band && frame) {
      remember(frame);

      gsap.fromTo(frame,
        { left: FRAME_INSET, right: FRAME_INSET, borderRadius: FRAME_RADIUS },
        {
          left: '0%',
          right: '0%',
          borderRadius: 0,
          ease: 'none',
          immediateRender: true,
          scrollTrigger: {
            trigger: band,
            start: 'top bottom',
            end: 'top top',
            scrub: 0.6,
            invalidateOnRefresh: true,
            onToggle: (self) => setWillChange(frame, self.isActive),
          },
        }
      );

      // immediateRender stays off so this never stomps the entry state
      // while the panel is still sitting full-bleed in the middle.
      gsap.fromTo(frame,
        { left: '0%', right: '0%', borderRadius: 0 },
        {
          left: FRAME_INSET,
          right: FRAME_INSET,
          borderRadius: FRAME_RADIUS,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: band,
            start: 'bottom bottom',
            end: 'bottom top',
            scrub: 0.6,
            invalidateOnRefresh: true,
            onToggle: (self) => setWillChange(frame, self.isActive),
          },
        }
      );
    }

    if (galleryContext) {
      remember(galleryContext);
      gsap.fromTo(galleryContext,
        { autoAlpha: 0, y: 26, filter: 'blur(5px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: band,
            start: 'top 78%',
            toggleActions: 'play none none none',
          },
          onComplete: () => setWillChange(galleryContext, false),
        }
      );
    }

    if (galleryGrid && galleryCards.length) {
      const cardTargets = remember(galleryCards);
      gsap.fromTo(cardTargets,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          stagger: 0.045,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: galleryGrid,
            start: 'top 88%',
            toggleActions: 'play none none none',
            onToggle: (self) => setWillChange(cardTargets, self.isActive),
          },
          onComplete: () => {
            setWillChange(cardTargets, false);
            // Hand the cards back to CSS so the filter's re-entry
            // animation isn't fighting leftover inline transforms.
            gsap.set(cardTargets, { clearProps: 'transform,opacity,visibility' });
          },
        }
      );
    }

    // Pin the context only where there is a second column to pin it
    // beside; below that the layout stacks and it scrolls normally.
    if (galleryLayout && galleryContext) {
      galleryMedia = gsap.matchMedia();
      galleryMedia.add('(min-width: 1024px)', () => {
        const pin = ScrollTrigger.create({
          trigger: galleryLayout,
          start: 'top top+=88',
          end: 'bottom bottom',
          pin: galleryContext,
          pinSpacing: false,
          invalidateOnRefresh: true,
        });

        return () => pin.kill();
      });
    }

    // Remaining sections keep their existing markup and gain restrained
    // GSAP reveals. Special story chapters above are deliberately excluded.
    const remainingReveals = Array.from(document.querySelectorAll('.reveal')).filter((element) => (
      !element.closest('#verse, #couple, #photo-band, #hero')
    ));

    remainingReveals.forEach((element) => {
      remember(element);

      if (element.classList.contains('stagger') && element.children.length) {
        const children = remember(Array.from(element.children));
        gsap.set(element, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });
        gsap.fromTo(children,
          { autoAlpha: 0, y: 24, filter: 'blur(5px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.78,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 82%',
              toggleActions: 'play none none none',
              onToggle: (self) => setWillChange(children, self.isActive),
            },
            onComplete: () => setWillChange(children, false),
          }
        );
        return;
      }

      gsap.fromTo(element,
        { autoAlpha: 0, y: 30, filter: 'blur(6px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 84%',
            toggleActions: 'play none none none',
            onToggle: (self) => setWillChange(element, self.isActive),
          },
          onComplete: () => setWillChange(element, false),
        }
      );
    });

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    }, { passive: true });

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => { });
    }

    requestAnimationFrame(() => ScrollTrigger.refresh());
    window.__scrollStoryActive = true;
    return true;
  } catch (error) {
    console.warn('Scroll story initialization failed; using native-scroll fallbacks.', error);

    if (coupleMedia) coupleMedia.revert();
    if (galleryMedia) galleryMedia.revert();
    if (smoother) smoother.kill();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
    animatedTargets.forEach((target) => {
      if (!target || !target.style) return;
      ['transform', 'opacity', 'visibility', 'filter', 'will-change', 'background-position-y']
        .forEach((property) => target.style.removeProperty(property));
    });

    document.documentElement.classList.remove('motion-enhanced');
    initFallbackReveals();
    return false;
  }
}

initScrollStory();
