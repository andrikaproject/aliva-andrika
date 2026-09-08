import { playReliably } from './audio.ts';
import { onLocaleChange, t } from './locale.ts';

/** Long enough for the tear to finish before the cover leaves the DOM. */
export const TEAR_DURATION_MS = 820;

const opened = { value: false };

type OpenListener = (detail: { playPromise: Promise<void> }) => void;
const openListeners = new Set<OpenListener>();

/** True once the guest has opened the invitation. */
export function isOpened(): boolean {
  return opened.value;
}

/**
 * Subscribe to the opening. A listener registered *after* the cover was
 * dismissed still fires, so a late-loading module (GSAP) never misses it.
 */
export function onInvitationOpen(listener: OpenListener): void {
  if (opened.value) {
    listener({ playPromise: Promise.resolve() });
    return;
  }
  openListeners.add(listener);
}

function renderGuestName(element: HTMLElement, name: string, key: string): void {
  element.textContent = t(key, { name });
}

function buildTearClipPaths(width: number, height: number, tearY: number) {
  const segments = 10;
  const top: string[] = [];
  const bottom: string[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const x = (width / segments) * index;
    const y = tearY + (index % 2 === 0 ? -1.5 : 1.5);
    bottom.push(`${x.toFixed(2)}px ${y.toFixed(2)}px`);
    top.unshift(`${x.toFixed(2)}px ${y.toFixed(2)}px`);
  }

  return {
    top: `polygon(0 0, ${width.toFixed(2)}px 0, ${top.join(', ')})`,
    bottom: `polygon(${bottom.join(', ')}, ${width.toFixed(2)}px ${height.toFixed(2)}px, 0 ${height.toFixed(2)}px)`,
  };
}

export function initInvitation(prefersReducedMotion: boolean): void {
  const cover = document.getElementById('cover-screen');
  const button = document.getElementById('cover-btn') as HTMLButtonElement | null;
  if (!cover || !button) return;

  const guestElement = document.getElementById('cover-guest');
  const hero = document.getElementById('hero');
  const ticket = cover.querySelector<HTMLElement>('.cover-ticket');
  const dash = cover.querySelector<HTMLElement>('.cover-ticket-dash');

  document.body.style.overflow = 'hidden';

  // ?to=Budi personalises the ticket; ?type=group switches to the form of
  // address used for a whole family or office.
  const params = new URLSearchParams(window.location.search);
  const guestName = params.get('to');
  if (guestName && guestElement) {
    const key = params.get('type')?.toLowerCase() === 'group' ? 'cover.groupGuestGreeting' : 'cover.guestGreeting';
    const safeName = guestName.replace(/[<>]/g, '').slice(0, 60);
    renderGuestName(guestElement, safeName, key);
    guestElement.classList.remove('hidden');
    onLocaleChange(() => renderGuestName(guestElement, safeName, key));
  }

  function cloneTicket(modifier: string): HTMLElement {
    const clone = ticket!.cloneNode(true) as HTMLElement;
    clone.classList.add('ticket-transition-clone', modifier);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    return clone;
  }

  function runTicketTear(): boolean {
    if (!ticket || !dash) return false;

    const ticketRect = ticket.getBoundingClientRect();
    const dashRect = dash.getBoundingClientRect();
    const tearY = dashRect.top - ticketRect.top + dashRect.height / 2;

    const stage = document.createElement('div');
    stage.className = 'ticket-transition-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.left = `${ticketRect.left}px`;
    stage.style.top = `${ticketRect.top}px`;
    stage.style.width = `${ticketRect.width}px`;
    stage.style.height = `${ticketRect.height}px`;
    stage.style.setProperty('--ticket-tear-y', `${tearY}px`);
    stage.style.setProperty('--ticket-zoom-scale', '1.030');

    const clipPaths = buildTearClipPaths(ticketRect.width, ticketRect.height, tearY);
    const top = cloneTicket('ticket-transition-clone--top');
    const bottom = cloneTicket('ticket-transition-clone--bottom');
    top.style.clipPath = clipPaths.top;
    bottom.style.clipPath = clipPaths.bottom;
    stage.append(top, bottom);

    cover!.appendChild(stage);
    cover!.classList.add('ticket-transitioning');

    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-active')));

    window.setTimeout(() => {
      hero?.classList.add('hero-emerge');
      cover!.classList.add('dismissed');
    }, 360);

    window.setTimeout(() => {
      stage.remove();
      cover!.remove();
    }, TEAR_DURATION_MS);

    return true;
  }

  function runFade(): void {
    cover!.classList.add('dismissed');
    window.setTimeout(() => hero?.classList.add('hero-emerge'), 120);
    window.setTimeout(() => cover!.remove(), 650);
  }

  button.addEventListener('click', () => {
    if (opened.value) return;
    opened.value = true;
    button.disabled = true;

    // Fire playback first, synchronously, inside the trusted gesture, then
    // hand the promise to whoever is mirroring the music UI.
    const audio = document.getElementById('bg-audio') as HTMLAudioElement | null;
    const playPromise = audio ? playReliably(audio) : Promise.resolve();
    playPromise.catch(() => {
      // The music widget reports this; the cover must not fail on it.
    });

    openListeners.forEach((listener) => listener({ playPromise }));
    openListeners.clear();

    document.body.style.overflow = '';

    if (prefersReducedMotion) {
      cover.classList.add('dismissed');
      cover.addEventListener('transitionend', () => cover.remove(), { once: true });
      return;
    }

    if (!runTicketTear()) runFade();
  });
}
