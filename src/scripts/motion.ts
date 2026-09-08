import { TEAR_DURATION_MS, isOpened, onInvitationOpen } from './invitation.ts';
import { initReveals, stopReveals } from './reveal.ts';

/**
 * The scroll story: inertial scrolling, scroll-scrubbed editorial layers and
 * a pinned couple chapter, adapted from the New Form Capital interaction
 * model. Desktop only — touch devices and reduced-motion keep native scroll
 * and the IntersectionObserver reveals.
 */
export function initScrollStory(prefersReducedMotion: boolean, nativeScrollMode: boolean): boolean {
  if (prefersReducedMotion || nativeScrollMode) return false;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const ScrollSmoother = window.ScrollSmoother;

  if (!gsap || !ScrollTrigger || !ScrollSmoother) {
    console.warn('Scroll story unavailable; using native-scroll fallbacks.');
    return false;
  }

  const animated = new Set<HTMLElement>();
  let smoother: any = null;
  let coupleMedia: any = null;
  let galleryMedia: any = null;
  let resizeTimer = 0;

  const remember = <T>(targets: T): T => {
    gsap.utils.toArray(targets).forEach((target: HTMLElement) => animated.add(target));
    return targets;
  };

  const setWillChange = (targets: unknown, active: boolean) => {
    gsap.set(targets, { willChange: active ? 'transform, opacity, filter' : 'auto' });
  };

  try {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    ScrollTrigger.config({ ignoreMobileResize: true });

    stopReveals();
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

    // GSAP may finish loading after the guest has already opened the
    // invitation, so this reads the current state instead of waiting for an
    // event that may have fired minutes ago.
    const coverStillUp = !isOpened();
    smoother.paused(coverStillUp);

    if (coverStillUp) {
      onInvitationOpen(() => {
        requestAnimationFrame(() => {
          smoother.paused(false);
          smoother.scrollTo(0, false);
        });
        window.setTimeout(() => ScrollTrigger.refresh(), TEAR_DURATION_MS + 80);
      });
    }

    // ── Hero: rows exit at different depths while the crops tighten ───────
    const heroTargets = remember(
      '.hero-masthead, .hero-meta, .hero-statement, .hero-scroll-cue, .hero-line, .hero-crop img',
    );

    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.75,
          invalidateOnRefresh: true,
          onToggle: (self: any) => setWillChange(heroTargets, self.isActive),
        },
      })
      .to('.hero-masthead', { yPercent: -70, autoAlpha: 0.15, duration: 1 }, 0)
      .to('.hero-meta', { yPercent: -38, autoAlpha: 0, duration: 0.85 }, 0)
      .to('.hero-line--celebrate', { yPercent: -24, duration: 1 }, 0)
      .to('.hero-line--happy', { yPercent: -11, duration: 1 }, 0)
      .to('.hero-line--names', { yPercent: 9, duration: 1 }, 0)
      .to('.hero-line--aliva', { yPercent: 19, duration: 1 }, 0)
      .to('.hero-crop img', { scale: 1.08, duration: 1 }, 0)
      .to('.hero-scroll-cue', { yPercent: 35, autoAlpha: 0, duration: 0.4 }, 0.56)
      .to('.hero-statement', { autoAlpha: 0.18, duration: 0.34 }, 0.66);

    // ── Verse: a calm, unpinned pause; lines enter in reading order ───────
    const verse = document.querySelector<HTMLElement>('#verse .reveal');
    if (verse) {
      const verseLines = remember(Array.from(verse.children) as HTMLElement[]);
      remember(verse);
      gsap.set(verse, { opacity: 1, y: 0, filter: 'blur(0px)' });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: '#verse',
            start: 'top 74%',
            toggleActions: 'play none none none',
            onToggle: (self: any) => setWillChange(verseLines, self.isActive),
          },
        })
        .fromTo(
          verseLines,
          { opacity: 0, y: 30, filter: 'blur(7px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.85,
            stagger: 0.11,
            ease: 'power3.out',
            onComplete: () => setWillChange(verseLines, false),
          },
        );
    }

    // ── Couple: pinned on roomy screens, a short scrub on compact ones so
    //    the cards never end up trapped below the fold ─────────────────────
    const couple = document.getElementById('couple');
    const coupleStage = document.querySelector<HTMLElement>('.couple-stage');
    const coupleHeading = document.querySelector<HTMLElement>('.couple-heading');
    const groom = document.querySelector<HTMLElement>('.couple-card--groom');
    const bride = document.querySelector<HTMLElement>('.couple-card--bride');
    const quote = document.querySelector<HTMLElement>('.couple-quote');

    if (couple && coupleStage && coupleHeading && groom && bride && quote) {
      const headingLines = Array.from(coupleHeading.children) as HTMLElement[];
      const coupleTargets = remember([...headingLines, groom, bride, quote]);
      remember([coupleStage, coupleHeading]);
      gsap.set(coupleHeading, { opacity: 1, y: 0, filter: 'blur(0px)' });

      coupleMedia = gsap.matchMedia();
      coupleMedia.add(
        {
          desktop: '(min-width: 768px) and (min-height: 700px)',
          compact: '(max-width: 767px), (max-height: 699px)',
        },
        (context: any) => {
          const isDesktop = Boolean(context.conditions.desktop);
          const distance = isDesktop ? Math.round(Math.min(1100, Math.max(780, window.innerHeight * 0.95))) : 0;
          const sideOffset = isDesktop ? 140 : 42;

          gsap
            .timeline({
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
                onToggle: (self: any) => setWillChange(coupleTargets, self.isActive),
              },
            })
            .fromTo(
              headingLines,
              { opacity: 0, y: 38, filter: 'blur(7px)' },
              { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.2, stagger: 0.025, ease: 'power3.out' },
              0,
            )
            .fromTo(
              groom,
              { opacity: 0, x: -sideOffset, y: 44, rotation: -1.4, filter: 'blur(9px)' },
              { opacity: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', duration: 0.29, ease: 'power3.out' },
              0.16,
            )
            .fromTo(
              bride,
              { opacity: 0, x: sideOffset, y: 44, rotation: 1.4, filter: 'blur(9px)' },
              { opacity: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', duration: 0.29, ease: 'power3.out' },
              0.29,
            )
            .fromTo(
              quote,
              { opacity: 0, y: 48, filter: 'blur(8px)' },
              { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.23, ease: 'power3.out' },
              0.71,
            );

          return () => setWillChange(coupleTargets, false);
        },
      );
    }

    // ── Photo band: the rounded panel expands to full bleed on the way in
    //    and contracts on the way out. Only the empty .gallery-frame moves,
    //    so nothing GSAP pins lives inside a transformed ancestor. ─────────
    const band = document.getElementById('photo-band');
    const frame = band?.querySelector<HTMLElement>('.gallery-frame') ?? null;
    const galleryLayout = band?.querySelector<HTMLElement>('.gallery-layout') ?? null;
    const galleryContext = band?.querySelector<HTMLElement>('.gallery-context__inner') ?? null;
    const galleryGrid = document.getElementById('galleryGrid');

    const FRAME_INSET = '6%';
    const FRAME_RADIUS = 56;

    if (band && frame) {
      remember(frame);

      gsap.fromTo(
        frame,
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
            onToggle: (self: any) => setWillChange(frame, self.isActive),
          },
        },
      );

      // immediateRender stays off so the exit never stomps the entry state
      // while the panel is sitting full-bleed mid-screen.
      gsap.fromTo(
        frame,
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
            onToggle: (self: any) => setWillChange(frame, self.isActive),
          },
        },
      );
    }

    if (galleryContext && band) {
      remember(galleryContext);
      gsap.fromTo(
        galleryContext,
        { opacity: 0, y: 26, filter: 'blur(5px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: band, start: 'top 78%', toggleActions: 'play none none none' },
          onComplete: () => setWillChange(galleryContext, false),
        },
      );
    }

    const galleryCards = galleryGrid ? Array.from(galleryGrid.querySelectorAll<HTMLElement>('.gallery-card')) : [];
    if (galleryGrid && galleryCards.length) {
      const cardTargets = remember(galleryCards);
      gsap.fromTo(
        cardTargets,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          stagger: 0.045,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: galleryGrid,
            start: 'top 88%',
            toggleActions: 'play none none none',
            onToggle: (self: any) => setWillChange(cardTargets, self.isActive),
          },
          onComplete: () => {
            setWillChange(cardTargets, false);
            // Hand the cards back to CSS so hover transitions are not fighting
            // leftover inline transforms.
            gsap.set(cardTargets, { clearProps: 'transform,opacity,visibility' });
          },
        },
      );
    }

    // Pin the context only where there is a second column to pin it beside.
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

    // ── Everything else keeps its markup and gains a restrained reveal ────
    const remaining = Array.from(document.querySelectorAll<HTMLElement>('.reveal')).filter(
      (element) => !element.closest('#verse, #couple, #photo-band, #hero'),
    );

    for (const element of remaining) {
      remember(element);

      if (element.classList.contains('stagger') && element.children.length) {
        const children = remember(Array.from(element.children) as HTMLElement[]);
        gsap.set(element, { opacity: 1, y: 0, filter: 'blur(0px)' });
        gsap.fromTo(
          children,
          { opacity: 0, y: 24, filter: 'blur(5px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.78,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 82%',
              toggleActions: 'play none none none',
              onToggle: (self: any) => setWillChange(children, self.isActive),
            },
            onComplete: () => setWillChange(children, false),
          },
        );
        continue;
      }

      gsap.fromTo(
        element,
        { opacity: 0, y: 30, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 84%',
            toggleActions: 'play none none none',
            onToggle: (self: any) => setWillChange(element, self.isActive),
          },
          onComplete: () => setWillChange(element, false),
        },
      );
    }

    // One debounced refresh per resize burst; ScrollTrigger.refresh() is
    // expensive and firing it per event doubles the pin maths.
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
      },
      { passive: true },
    );

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    requestAnimationFrame(() => ScrollTrigger.refresh());

    // A guest tabbing ahead of their scroll must not land on something that
    // has not been revealed yet. Focus finishes the reveal immediately and
    // brings the element into view through the smoother.
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement | null;
      const reveal = target?.closest<HTMLElement>('.reveal');
      if (!reveal) return;

      if (Number(getComputedStyle(reveal).opacity) < 0.99) {
        gsap.set(reveal, { opacity: 1, y: 0, filter: 'none', clearProps: 'visibility' });
        gsap.set(Array.from(reveal.children), { opacity: 1, y: 0, filter: 'none' });
      }

      const rect = target!.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) smoother?.scrollTo(target!, true, 'center center');
    });

    window.__scrollStoryActive = true;
    return true;
  } catch (error) {
    console.warn('Scroll story initialization failed; using native-scroll fallbacks.', error);

    coupleMedia?.revert();
    galleryMedia?.revert();
    smoother?.kill();
    ScrollTrigger.getAll?.().forEach((trigger: any) => trigger.kill(true));

    for (const target of animated) {
      for (const property of ['transform', 'opacity', 'visibility', 'filter', 'will-change', 'background-position-y']) {
        target.style?.removeProperty(property);
      }
    }

    document.documentElement.classList.remove('motion-enhanced');
    window.__scrollStoryActive = false;
    initReveals();
    return false;
  }
}
