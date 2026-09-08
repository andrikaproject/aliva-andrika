/**
 * Falling petals, drawn on a fixed canvas behind the story.
 *
 * Each petal carries a depth: far ones are larger, slower and fainter, near
 * ones smaller, quicker and more present, and scroll shifts them by depth so
 * the layers separate as the guest moves through the invitation.
 */

const COLORS = ['#E8C4B8', '#D4998A', '#E8D5A3', '#C9A96E', '#D4DDD0', '#9CAF98'];

interface Petal {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  drift: number;
  rotation: number;
  spin: number;
  alpha: number;
  parallax: number;
}

export function initPetals(prefersReducedMotion: boolean): () => void {
  const canvas = document.getElementById('petalCanvas') as HTMLCanvasElement | null;
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return () => {};

  const count = window.matchMedia('(max-width: 640px)').matches ? 12 : 24;

  let width = 0;
  let height = 0;
  let band = 0;
  let petals: Petal[] = [];
  let frame = 0;
  let resizeTimer = 0;

  function resize(): void {
    width = canvas!.width = window.innerWidth;
    height = canvas!.height = window.innerHeight;
    // A band taller than the viewport lets petals wrap without a visible seam.
    band = height + 120;
  }

  function makePetal(spread: boolean): Petal {
    const depth = Math.random();
    return {
      x: Math.random() * width,
      y: spread ? Math.random() * band : -20,
      size: (Math.random() * 3 + 3) * (1.6 - depth * 0.9),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      speed: 0.18 + depth * 0.65,
      drift: (Math.random() - 0.5) * (0.15 + depth * 0.45),
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * (0.01 + depth * 0.03),
      alpha: 0.12 + depth * 0.2,
      parallax: 0.04 + depth * 0.16,
    };
  }

  const wrap = (value: number, max: number) => ((value % max) + max) % max;

  function paintPetal(petal: Petal, y: number): void {
    context!.save();
    context!.translate(petal.x, y);
    context!.rotate(petal.rotation);
    context!.globalAlpha = petal.alpha;
    context!.fillStyle = petal.color;
    context!.beginPath();
    context!.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
    context!.fill();
    context!.restore();
  }

  function drawStatic(): void {
    context!.clearRect(0, 0, width, height);
    for (const petal of petals) paintPetal(petal, wrap(petal.y, height));
  }

  function tick(): void {
    context!.clearRect(0, 0, width, height);
    const scrollY = window.scrollY;

    for (const petal of petals) {
      petal.y = wrap(petal.y + petal.speed, band);
      petal.x += petal.drift;
      if (petal.x < -20) petal.x = width + 20;
      else if (petal.x > width + 20) petal.x = -20;
      petal.rotation += petal.spin;
      paintPetal(petal, wrap(petal.y - scrollY * petal.parallax, band) - 60);
    }

    frame = requestAnimationFrame(tick);
  }

  function start(): void {
    if (frame || prefersReducedMotion) return;
    frame = requestAnimationFrame(tick);
  }

  function pause(): void {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      if (prefersReducedMotion) drawStatic();
    }, 150);
  };

  // Decoration is not worth a repaint on a tab nobody is looking at.
  const onVisibility = () => (document.hidden ? pause() : start());

  resize();
  petals = Array.from({ length: count }, () => makePetal(true));

  if (prefersReducedMotion) drawStatic();
  else start();

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    pause();
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
