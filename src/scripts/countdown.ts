import { countdownTarget } from '../data/wedding.ts';

const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const;
type Unit = (typeof UNITS)[number];

const MS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 } as const;

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Time left until the target, floored at zero.
 *
 * `target` carries its own +07:00 offset, so a guest in Jakarta and a guest
 * in Berlin see the same number — the pre-refactor code parsed a bare local
 * timestamp and disagreed by seven hours.
 */
export function remainingUntil(target: string, now: number = Date.now()): Remaining {
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(diff / MS.day),
    hours: Math.floor((diff % MS.day) / MS.hour),
    minutes: Math.floor((diff % MS.hour) / MS.minute),
    seconds: Math.floor((diff % MS.minute) / MS.second),
  };
}

export function initCountdown(): () => void {
  const cells = new Map<Unit, HTMLElement>();
  for (const unit of UNITS) {
    const element = document.getElementById(`cd-${unit}`);
    if (element) cells.set(unit, element);
  }
  if (cells.size === 0) return () => {};

  let timer = 0;

  const tick = () => {
    const remaining = remainingUntil(countdownTarget);
    for (const [unit, element] of cells) {
      element.textContent = String(remaining[unit]).padStart(2, '0');
    }
  };

  const start = () => {
    tick();
    timer = window.setInterval(tick, 1000);
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  // A hidden tab does not need a per-second repaint.
  const onVisibility = () => {
    stop();
    if (!document.hidden) start();
  };

  start();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
