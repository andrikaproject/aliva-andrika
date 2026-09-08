import { playReliably } from './audio.ts';
import { onInvitationOpen } from './invitation.ts';

export function initMusicPlayer(): void {
  const audio = document.getElementById('bg-audio') as HTMLAudioElement | null;
  const button = document.getElementById('music-btn');
  const panel = document.getElementById('music-panel');
  const progress = document.getElementById('music-progress');
  const iconNote = document.getElementById('icon-note');
  const iconMute = document.getElementById('icon-mute');
  if (!audio || !button || !panel) return;

  /** What the guest asked for, as opposed to what the browser is doing. */
  let wantsMusic = false;

  function setUI(playing: boolean): void {
    panel!.classList.toggle('open', playing);
    button!.classList.toggle('is-playing', playing);
    button!.setAttribute('aria-pressed', String(playing));
    iconNote?.classList.toggle('hidden', !playing);
    iconMute?.classList.toggle('hidden', playing);
  }

  /** Mirror the UI to what playback actually did, never to the intent. */
  function track(attempt: Promise<void>): Promise<boolean> {
    return attempt
      .then(() => {
        if (!wantsMusic || document.hidden) {
          audio!.pause();
          setUI(false);
          return false;
        }
        audio!.muted = false;
        audio!.volume = 1;
        setUI(true);
        return true;
      })
      .catch((error: unknown) => {
        wantsMusic = false;
        setUI(false);
        if (import.meta.env.DEV) console.warn('Wedding music could not start:', error);
        return false;
      });
  }

  function start(): Promise<boolean> {
    wantsMusic = true;
    return track(playReliably(audio!));
  }

  function stop(): void {
    wantsMusic = false;
    audio!.pause();
    audio!.volume = 1;
    setUI(false);
  }

  button.addEventListener('click', () => {
    if (wantsMusic) stop();
    else void start();
  });

  audio.addEventListener('playing', () => {
    if (wantsMusic && !document.hidden) setUI(true);
  });
  audio.addEventListener('pause', () => setUI(false));
  audio.addEventListener('error', () => {
    wantsMusic = false;
    setUI(false);
  });

  const syncProgress = () => {
    if (!progress || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  };
  audio.addEventListener('timeupdate', syncProgress);
  audio.addEventListener('loadedmetadata', syncProgress);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && wantsMusic && !audio.paused) audio.pause();
    else if (!document.hidden && wantsMusic) void track(playReliably(audio));
  });

  // The cover already called play() inside the click. We adopt that promise
  // rather than starting a second, untrusted one.
  onInvitationOpen(({ playPromise }) => {
    wantsMusic = true;
    void track(playPromise);
  });

  setUI(false);
}
