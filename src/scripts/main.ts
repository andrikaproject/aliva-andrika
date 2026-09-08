import { initCountdown } from './countdown.ts';
import { initGalleryCount } from './gallery.ts';
import { initGift } from './gift.ts';
import { initInvitation } from './invitation.ts';
import { initLocale } from './locale.ts';
import { initMusicPlayer } from './music.ts';
import { initPetals } from './petals.ts';
import { initReveals } from './reveal.ts';
import { initRsvp } from './rsvp.ts';

/**
 * Motion policy, decided once.
 *
 * Native scroll covers phones, short viewports and any coarse pointer. Those
 * devices never download GSAP — the bootstrap in the layout makes the same
 * call before this module loads.
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nativeScrollMode =
  window.matchMedia('(max-width: 767px), (max-height: 699px), (pointer: coarse)').matches ||
  navigator.maxTouchPoints > 0;

// Tells the layout's watchdog that scripting arrived, so it leaves the cover
// alone.
document.documentElement.dataset.invitationReady = 'true';

initLocale();
initInvitation(prefersReducedMotion);
initMusicPlayer();
initCountdown();
initGift();
initGalleryCount();
initRsvp();
initPetals(prefersReducedMotion);
initReveals();

// The scroll story is the last thing to start, and only once its bundle has
// resolved. A failed import leaves the invitation on native scroll with the
// IntersectionObserver reveals already running.
const ready = window.__scrollStoryReady;
if (ready && typeof ready.then === 'function') {
  void ready
    .then(async () => {
      const { initScrollStory } = await import('./motion');
      initScrollStory(prefersReducedMotion, nativeScrollMode);
    })
    .catch((error: unknown) => {
      console.warn('Scroll story dependencies failed; using native-scroll fallbacks.', error);
    });
}
