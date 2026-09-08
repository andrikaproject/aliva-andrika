import { onLocaleChange, t } from './locale.ts';

const RESET_DELAY_MS = 2200;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based fallback below.
    }
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
  document.body.appendChild(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}

export function initGift(): void {
  const cards = document.querySelectorAll<HTMLElement>('[data-gift-account]');

  cards.forEach((card) => {
    const account = (card.dataset.giftAccount ?? '').replace(/\s+/g, '').trim();
    const button = card.querySelector<HTMLButtonElement>('[data-gift-copy]');
    const label = card.querySelector<HTMLElement>('[data-gift-copy-label]');
    const statusLine = card.querySelector<HTMLElement>('[data-gift-status]');
    if (!button || !account) return;

    let timer = 0;
    let labelKey = 'gift.copyAccount';
    let statusKey = 'gift.copyHint';

    const paint = () => {
      if (label) label.textContent = t(labelKey);
      if (statusLine) statusLine.textContent = t(statusKey);
    };

    // The number is already in the HTML; the button is the enhancement, so it
    // only appears once this module is running.
    button.hidden = false;
    paint();
    onLocaleChange(paint);

    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      try {
        await copyText(account);
        labelKey = 'gift.copied';
        statusKey = 'gift.copiedStatus';
        paint();
        statusLine?.classList.add('is-visible');
        button.classList.add('is-copied');

        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          labelKey = 'gift.copyAccount';
          statusKey = 'gift.copyHint';
          paint();
          statusLine?.classList.remove('is-visible');
          button.classList.remove('is-copied');
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }, RESET_DELAY_MS);
      } catch {
        statusKey = 'gift.copyError';
        paint();
        statusLine?.classList.add('is-visible');
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  });
}
