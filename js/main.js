// ── CONFIG ─────────────────────────────────────────────────────
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


// ── PETAL / CONFETTI ANIMATION ─────────────────────────────────
(function initPetals() {
  const canvas = document.getElementById('petalCanvas');
  const ctx    = canvas.getContext('2d');
  let   W, H, petals = [];

  const COLORS = ['#E8C4B8', '#D4998A', '#E8D5A3', '#C9A96E', '#D4DDD0', '#9CAF98'];
  const COUNT  = 28;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function randomPetal() {
    return {
      x:     Math.random() * W,
      y:     Math.random() * H * -1,
      size:  Math.random() * 6 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: Math.random() * 0.6 + 0.3,
      drift: (Math.random() - 0.5) * 0.5,
      rot:   Math.random() * Math.PI * 2,
      rotS:  (Math.random() - 0.5) * 0.04,
      alpha: Math.random() * 0.5 + 0.2,
    };
  }

  function init() {
    resize();
    petals = Array.from({ length: COUNT }, () => {
      const p = randomPetal();
      p.y = Math.random() * H; // distribute initially
      return p;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.y   += p.speed;
      p.x   += p.drift;
      p.rot += p.rotS;

      if (p.y > H + 20) {
        const fresh = randomPetal();
        p.x = fresh.x; p.y = -20; p.speed = fresh.speed;
        p.drift = fresh.drift; p.color = fresh.color;
        p.size = fresh.size; p.alpha = fresh.alpha;
      }
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
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
  let hasStarted = false; // track first play to set start time once

  function setPlaying(state) {
    isPlaying = state;
    if (state) {
      if (!hasStarted) {
        audio.currentTime = 100; // start at 1:40
        hasStarted = true;
      }
      audio.play().catch(() => {}); // ignore autoplay-blocked errors silently
      panel.classList.add('open');
      btn.classList.add('is-playing');
      iconNote.classList.remove('hidden');
      iconMute.classList.add('hidden');
    } else {
      audio.pause();
      panel.classList.remove('open');
      btn.classList.remove('is-playing');
      iconNote.classList.add('hidden');
      iconMute.classList.remove('hidden');
    }
  }

  // Toggle on button click
  btn.addEventListener('click', () => setPlaying(!isPlaying));

  // Progress bar
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });

  // Pause when tab is hidden, resume when visible again
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
      audio.pause();
    } else if (!document.hidden && isPlaying) {
      audio.play().catch(() => {});
    }
  });

  // Auto-play on first user interaction (respects browser autoplay policy)
  // NOTE: touchstart is intentionally excluded — on mobile, touchstart fires
  // before the button's click handler, causing a double-toggle race condition
  // that immediately pauses the music after starting it.
  function tryAutoplay() {
    if (!isPlaying) setPlaying(true);
  }
  document.addEventListener('click',   tryAutoplay, { once: true });
  document.addEventListener('keydown', tryAutoplay, { once: true });
})();
