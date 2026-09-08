/**
 * The no-GSAP reveal: elements marked .reveal gain .visible as they enter.
 * The scroll story tears this down when it takes over, so the two never
 * animate the same element.
 */

let observer: IntersectionObserver | null = null;

export function initReveals(): void {
  if (observer) return;

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      }
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll('.reveal').forEach((element) => observer!.observe(element));
}

export function stopReveals(): void {
  observer?.disconnect();
  observer = null;
}
