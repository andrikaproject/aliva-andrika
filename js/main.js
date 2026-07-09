// ── Motion preference (shared) ─────────────────────────────────
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


// ── COVER SCREEN + LIGHT-BLOOM OPENING ─────────────────────────
(function initCover() {
  const cover   = document.getElementById('cover-screen');
  const btn     = document.getElementById('cover-btn');
  const guestEl = document.getElementById('cover-guest');
  const bloom   = document.getElementById('bloom');
  const hero    = document.getElementById('hero');

  // Lock body scroll while cover is visible
  document.body.style.overflow = 'hidden';

  // Show guest name if ?to= param exists
  const name = new URLSearchParams(window.location.search).get('to');
  if (name) {
    guestEl.textContent = 'Dear ' + name + ' & Partner';
    guestEl.classList.remove('hidden');
  }

  btn.addEventListener('click', () => {
    // iOS requires audio.play() to run synchronously inside the trusted
    // click gesture. Fire it first, capture the Promise, and hand it to the
    // music player via a custom event so it can sync its UI to the outcome.
    const audio = document.getElementById('bg-audio');
    const playPromise = audio ? audio.play() : null;
    window.dispatchEvent(new CustomEvent('invitation-opened', { detail: { playPromise } }));

    // Unlock scroll as soon as the journey begins
    document.body.style.overflow = '';

    // Reduced motion → simple cross-fade, no bloom
    if (REDUCED_MOTION) {
      cover.classList.add('dismissed');
      cover.addEventListener('transitionend', () => cover.remove(), { once: true });
      return;
    }

    // Anchor the golden bloom at the button, then flare it out
    const rect = btn.getBoundingClientRect();
    bloom.style.left = (rect.left + rect.width  / 2) + 'px';
    bloom.style.top  = (rect.top  + rect.height / 2) + 'px';
    bloom.classList.add('active');

    // Dissolve the cover into the light
    setTimeout(() => cover.classList.add('dismissed'), 250);

    // Hero emerges from within the light
    setTimeout(() => { if (hero) hero.classList.add('hero-emerge'); }, 500);

    // Clean up once the flare has faded
    setTimeout(() => {
      cover.remove();
      bloom.classList.remove('active');
    }, 1650);
  });
})();


// ── GUEST PERSONALIZATION ───────────────────────────────────────
// Usage: share the link as  ?to=Nama+Tamu
// e.g.  https://yourdomain.com/?to=Budi+%26+Sari
(function initGuestName() {
  const params = new URLSearchParams(window.location.search);
  const name   = params.get('to');
  if (!name) return;                       // no param → keep default text

  const line1 = document.getElementById('open-inv-line1');
  if (!line1) return;

  line1.innerHTML =
    `You're Invited,<br>` +
    `<span style="font-size:0.85em;opacity:0.85;">${name} &amp; Partner</span>`;
})();



// Change this to your actual wedding date/time
const WEDDING_DATE = new Date('2026-10-17T08:30:00');

// ── COUNTDOWN TIMER ────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function updateCountdown() {
  const now  = new Date();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent    = '00';
    document.getElementById('cd-hours').textContent   = '00';
    document.getElementById('cd-minutes').textContent = '00';
    document.getElementById('cd-seconds').textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('cd-days').textContent    = pad(days);
  document.getElementById('cd-hours').textContent   = pad(hours);
  document.getElementById('cd-minutes').textContent = pad(minutes);
  document.getElementById('cd-seconds').textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);


// ── NAVBAR SCROLL ──────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});


// ── MOBILE MENU ────────────────────────────────────────────────
const toggle     = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

toggle.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close menu on nav link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});


// ── RSVP FORM ──────────────────────────────────────────────────
function handleRsvp(e) {
  e.preventDefault();
  const form    = document.getElementById('rsvp-form');
  const success = document.getElementById('rsvp-success');
  // Here you can send form data to your backend or a service like Formspree
  // For now, just show success UI
  form.style.display    = 'none';
  success.style.display = 'block';
}


// ── REVEAL ON SCROLL ───────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


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
    W  = canvas.width  = window.innerWidth;
    H  = canvas.height = window.innerHeight;
    VH = H + 120;                    // virtual band, taller than viewport for seamless wrap
  }

  function makePetal(spread) {
    const depth = Math.random();     // 0 far … 1 near
    return {
      x:     Math.random() * W,
      y:     spread ? Math.random() * VH : -20,
      depth: depth,
      size:  (Math.random() * 3 + 3) * (1.6 - depth * 0.9),   // far → larger
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 0.18 + depth * 0.65,                             // near → faster fall
      drift: (Math.random() - 0.5) * (0.15 + depth * 0.45),
      rot:   Math.random() * Math.PI * 2,
      rotS:  (Math.random() - 0.5) * (0.01 + depth * 0.03),
      alpha: 0.12 + depth * 0.20,                             // near → more present
      par:   0.04 + depth * 0.16,                             // scroll parallax factor
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
      p.y   = wrap(p.y + p.speed, VH);
      p.x  += p.drift;
      if (p.x < -20)      p.x = W + 20;
      else if (p.x > W + 20) p.x = -20;
      p.rot += p.rotS;

      // parallax: nearer petals shift more with scroll
      const ry = wrap(p.y - scrollY * p.par, VH) - 60;

      ctx.save();
      ctx.translate(p.x, ry);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
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
      ctx.fillStyle   = p.color;
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


// ── PHOTO BAND PARALLAX (subtle; ready for real photos) ────────
(function initPhotoBand() {
  if (REDUCED_MOTION) return;
  const band = document.querySelector('#photo-band .photo-band-inner');
  if (!band) return;

  function onScroll() {
    const r = band.getBoundingClientRect();
    const prog = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    const clamped = Math.max(0, Math.min(1, prog));
    band.style.backgroundPositionY = (30 + clamped * 40) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// ── MUSIC PLAYER ───────────────────────────────────────────────
(function initMusicPlayer() {
  const audio    = document.getElementById('bg-audio');
  const btn      = document.getElementById('music-btn');
  const panel    = document.getElementById('music-panel');
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
    audio.play().then(() => {
      setUIPlaying(true);
    }).catch(() => {});
  }

  function stopPlay() {
    audio.pause();
    setUIPlaying(false);
  }

  // Toggle button
  btn.addEventListener('click', () => {
    if (isPlaying) stopPlay(); else startPlay();
  });

  // Progress bar (track loops naturally via the `loop` attribute)
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });

  // Pause/resume on tab visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
      audio.pause();
    } else if (!document.hidden && isPlaying) {
      audio.play().catch(() => {});
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
        .catch(() => {/* blocked — widget stays available for a manual tap */});
    } else {
      // No promise handed over (e.g. missing audio) — try once, ignore failure.
      audio.play().then(() => setUIPlaying(true)).catch(() => {});
    }
  });
})();
