// ── Motion preference (shared) ─────────────────────────────────
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MUSIC_START_SECONDS = 12;
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
    guestEl.textContent = 'Dear ' + name + ' & Partner';
    guestEl.classList.remove('hidden');
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


// ── PHOTO BAND PARALLAX FALLBACK ───────────────────────────────
// Used only when GSAP is unavailable. The enhanced version lives in
// initScrollStory() so there is never more than one scroll listener.
function initFallbackPhotoBand() {
  if (REDUCED_MOTION || window.__photoBandFallbackStarted) return;
  const band = document.querySelector('#photo-band .photo-band-inner');
  if (!band) return;
  window.__photoBandFallbackStarted = true;

  function onScroll() {
    const r = band.getBoundingClientRect();
    const prog = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    const clamped = Math.max(0, Math.min(1, prog));
    band.style.backgroundPositionY = (30 + clamped * 40) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


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
        const distance = isDesktop ? 1700 : 0;
        const sideOffset = isDesktop ? 140 : 42;

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: couple,
            start: isDesktop ? 'top top' : 'top 78%',
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

    // Photo band: a single scrubbed camera move replaces the old manual
    // window-scroll listener and keeps all work inside ScrollTrigger.
    const photoBand = document.querySelector('#photo-band .photo-band-inner');
    const photoContent = document.querySelector('#photo-band .photo-band-content');
    if (photoBand && photoContent) {
      const photoTargets = remember(photoBand);
      remember(photoContent);

      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '#photo-band',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.7,
          invalidateOnRefresh: true,
          onToggle: (self) => setWillChange(photoTargets, self.isActive),
        },
      })
        .fromTo(photoBand,
          { backgroundPositionY: '38%' },
          { backgroundPositionY: '68%', duration: 1 },
          0
        );

      gsap.fromTo(photoContent,
        { autoAlpha: 0, y: 24, filter: 'blur(5px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '#photo-band',
            start: 'top 82%',
            toggleActions: 'play none none none',
            onToggle: (self) => setWillChange(photoContent, self.isActive),
          },
          onComplete: () => setWillChange(photoContent, false),
        }
      );
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

if (!initScrollStory()) initFallbackPhotoBand();
