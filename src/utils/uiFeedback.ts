/**
 * Global Tactile Button Highlight & Web Audio Sound Feedback Utility
 * Gives every button press across the POS an immediate color flash highlight and crisp audio feedback,
 * with special celebratory highlights & chimes for Full Backup / Sync / Save actions.
 */

const SOUND_PREF_KEY = 'retail_pos_sound_effects_enabled';
const SOUND_CHANGED_EVENT = 'retail_pos_sound_pref_changed';

export type ButtonFeedbackKind = 'tap' | 'backup' | 'danger' | 'success';

let sharedAudioCtx: AudioContext | null = null;
let listenersInitialized = false;
const activeFlashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function isSoundEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (raw === null) return true; // Enabled by default
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Ignore storage issues
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SOUND_CHANGED_EVENT, { detail: { enabled } }));
  }
}

export function subscribeToSoundPref(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ enabled?: boolean }>;
    callback(custom.detail?.enabled ?? isSoundEnabled());
  };
  window.addEventListener(SOUND_CHANGED_EVENT, handler);
  return () => window.removeEventListener(SOUND_CHANGED_EVENT, handler);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  durationSec: number,
  delaySec = 0,
  volume = 0.06,
  type: OscillatorType = 'sine'
) {
  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.01);
}

export function playButtonSound(kind: ButtonFeedbackKind = 'tap'): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (kind === 'backup') {
      // Bright two-note ascending chime for Full Backup / Snapshot / Sync buttons
      playTone(ctx, 523.25, 587.33, 0.08, 0, 0.075, 'triangle');
      playTone(ctx, 783.99, 880, 0.14, 0.065, 0.085, 'sine');
    } else if (kind === 'success') {
      // Celebratory 3-note confirmation triad
      playTone(ctx, 523.25, 523.25, 0.08, 0, 0.07, 'sine');
      playTone(ctx, 659.25, 659.25, 0.09, 0.065, 0.075, 'sine');
      playTone(ctx, 783.99, 783.99, 0.16, 0.13, 0.09, 'triangle');
    } else if (kind === 'danger') {
      // Crisp low cautionary tap for delete/purge actions
      playTone(ctx, 260, 175, 0.075, 0, 0.07, 'triangle');
    } else {
      // Clean tactile soft click for any button across the app
      playTone(ctx, 640, 440, 0.042, 0, 0.05, 'sine');
    }
  } catch {
    // Ignore audio synthesis errors on locked browsers
  }
}

export function playBackupSuccessSound(): void {
  playButtonSound('success');
}

function classifyButtonElement(el: HTMLElement): ButtonFeedbackKind {
  const explicit = el.getAttribute('data-feedback');
  if (explicit === 'backup' || explicit === 'danger' || explicit === 'success' || explicit === 'tap') {
    return explicit;
  }

  const id = (el.id || '').toLowerCase();
  const label = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
  const classes = typeof el.className === 'string' ? el.className.toLowerCase() : '';

  if (
    id.includes('backup') ||
    id.includes('snapshot') ||
    label.includes('full system backup') ||
    label.includes('full snapshot') ||
    label.includes('download .json backup') ||
    label.includes('send backup') ||
    label.includes('push to cloud') ||
    label.includes('sync local data')
  ) {
    return 'backup';
  }

  if (
    id.includes('delete') ||
    id.includes('purge') ||
    id.includes('clear') ||
    label.includes('delete') ||
    label.includes('purge') ||
    label.includes('clear all') ||
    classes.includes('bg-rose-600') ||
    classes.includes('bg-red-600')
  ) {
    return 'danger';
  }

  return 'tap';
}

export function triggerButtonColorFlash(el: HTMLElement, kind: ButtonFeedbackKind): void {
  if (!el) return;

  const existingTimer = activeFlashTimers.get(el);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  el.classList.remove('ui-btn-flash-primary', 'ui-btn-flash-backup', 'ui-btn-flash-danger');
  // Force reflow so rapid consecutive presses replay the animation cleanly
  void el.offsetWidth;

  const flashClass =
    kind === 'backup' || kind === 'success'
      ? 'ui-btn-flash-backup'
      : kind === 'danger'
      ? 'ui-btn-flash-danger'
      : 'ui-btn-flash-primary';

  el.classList.add(flashClass);

  const timer = setTimeout(() => {
    el.classList.remove('ui-btn-flash-primary', 'ui-btn-flash-backup', 'ui-btn-flash-danger');
    activeFlashTimers.delete(el);
  }, 420);

  activeFlashTimers.set(el, timer);
}

export function initGlobalButtonFeedback(): () => void {
  if (typeof document === 'undefined' || listenersInitialized) {
    return () => {};
  }
  listenersInitialized = true;

  const handleTrigger = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const btn = target.closest('button, [role="button"]') as HTMLElement | null;
    if (!btn) return;
    if ((btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true') return;
    if (btn.getAttribute('data-no-feedback') === 'true') return;

    const kind = classifyButtonElement(btn);
    triggerButtonColorFlash(btn, kind);
    playButtonSound(kind);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    handleTrigger(e.target);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleTrigger(e.target);
    }
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    listenersInitialized = false;
  };
}
