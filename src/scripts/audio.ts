/**
 * Playback helpers shared by the cover button and the music widget.
 *
 * The invitation's one hard rule: the first `play()` must happen inside the
 * trusted click, with nothing awaited before it. iOS refuses playback that
 * starts after an await, and a cover that swallows the tap is worse than a
 * silent invitation.
 */

const NON_RETRYABLE = new Set(['NotAllowedError', 'NotSupportedError', 'SecurityError']);

export function play(audio: HTMLAudioElement): Promise<void> {
  // Start audible. Some in-app browsers resolve play() while leaving a
  // scripted fade parked at volume 0.
  audio.defaultMuted = false;
  audio.muted = false;
  audio.volume = 1;

  let result: Promise<void> | undefined;
  try {
    result = audio.play();
  } catch (error) {
    return Promise.reject(error);
  }

  return Promise.resolve(result).then(() => {
    audio.defaultMuted = false;
    audio.muted = false;
    audio.volume = 1;
  });
}

function waitUntilPlayable(audio: HTMLAudioElement, timeoutMs = 5000): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const done = (settle: () => void) => () => {
      window.clearTimeout(timer);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      settle();
    };

    const onCanPlay = done(resolve);
    const onError = done(() => reject(audio.error ?? new Error('Wedding audio failed to load')));

    const timer = window.setTimeout(
      done(() => reject(new Error('Wedding audio did not become playable in time'))),
      timeoutMs,
    );

    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
  });
}

/**
 * Play, and on a cold mobile load give the browser one second chance once it
 * reports enough buffered audio. Permission and format failures are final.
 */
export function playReliably(audio: HTMLAudioElement): Promise<void> {
  return play(audio).catch((error: unknown) => {
    const name = error instanceof Error ? error.name : '';
    if (audio.error || NON_RETRYABLE.has(name)) throw error;
    return waitUntilPlayable(audio).then(() => play(audio));
  });
}
