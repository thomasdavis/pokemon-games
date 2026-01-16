/**
 * Sound Effects Package
 *
 * Provides sound effects for games using the Web Audio API.
 *
 * This package exposes both RAW APIs for sophisticated implementations
 * and helper methods for quick implementations.
 *
 * @example
 * // RAW API - Full control over sound playback
 * import { playSound, stopSound, setGlobalVolume, SoundEffect } from '@/lib/sounds';
 *
 * // Progressive streak sounds that get faster and louder
 * const playStreakSound = (streak: number) => {
 *   playSound('combo', {
 *     rate: 1 + (streak * 0.1),
 *     volume: Math.min(1, 0.5 + (streak * 0.1)),
 *   });
 * };
 *
 * // Layered legendary encounter
 * playSound('whoosh', { volume: 0.3 });
 * setTimeout(() => playSound('powerup', { rate: 0.8 }), 200);
 *
 * @example
 * // Helper methods for quick implementations
 * success();  // Play success sound
 * coin();     // Play coin sound
 */

// ============ RAW EXPORTS - Use these for creative, sophisticated implementations ============

// Sound types available
export type SoundEffect =
  | 'click'
  | 'success'
  | 'error'
  | 'pop'
  | 'whoosh'
  | 'ding'
  | 'coin'
  | 'levelup'
  | 'powerup'
  | 'bounce'
  | 'catch'
  | 'release'
  | 'win'
  | 'lose'
  | 'countdown'
  | 'select'
  | 'hover'
  | 'card_flip'
  | 'match'
  | 'combo'
  | 'streak';

// Sound file paths (relative to public folder)
// Some sounds are .wav fallbacks if .mp3 download failed
const SOUND_PATHS: Record<SoundEffect, string> = {
  click: '/sounds/click.mp3',
  success: '/sounds/success.wav', // fallback
  error: '/sounds/error.mp3',
  pop: '/sounds/pop.mp3',
  whoosh: '/sounds/whoosh.mp3',
  ding: '/sounds/ding.mp3',
  coin: '/sounds/coin.mp3',
  levelup: '/sounds/levelup.mp3',
  powerup: '/sounds/powerup.mp3',
  bounce: '/sounds/bounce.mp3',
  catch: '/sounds/catch.mp3',
  release: '/sounds/release.mp3',
  win: '/sounds/win.wav', // fallback
  lose: '/sounds/lose.mp3',
  countdown: '/sounds/countdown.mp3',
  select: '/sounds/select.wav', // fallback
  hover: '/sounds/hover.mp3',
  card_flip: '/sounds/card_flip.mp3',
  match: '/sounds/match.mp3',
  combo: '/sounds/combo.mp3',
  streak: '/sounds/streak.mp3',
};

// ============ TYPE EXPORTS ============

export interface PlaySoundOptions {
  /** Volume (0-1), multiplied by global volume */
  volume?: number;
  /** Playback rate (0.5-2, default: 1) */
  rate?: number;
  /** Whether to loop the sound */
  loop?: boolean;
}

// Audio cache for preloaded sounds
const audioCache: Map<SoundEffect, HTMLAudioElement> = new Map();

// Global volume (0-1)
let globalVolume = 0.7;

// Mute state
let isMuted = false;

// ============ RAW API EXPORTS ============

/**
 * Get all available sound effect names
 */
export const getAllSoundEffects = (): SoundEffect[] => {
  return Object.keys(SOUND_PATHS) as SoundEffect[];
};

/**
 * Get the file path for a sound effect
 */
export const getSoundPath = (sound: SoundEffect): string => {
  return SOUND_PATHS[sound];
};

/**
 * Create an Audio element for a sound (for advanced control)
 */
export const createAudio = (sound: SoundEffect): HTMLAudioElement => {
  return new Audio(SOUND_PATHS[sound]);
};

/**
 * Create an Audio element from any URL (for custom sounds)
 */
export const createCustomAudio = (url: string): HTMLAudioElement => {
  return new Audio(url);
};

/**
 * Play a custom audio URL with options
 */
export function playCustomSound(
  url: string,
  options: PlaySoundOptions = {}
): HTMLAudioElement | null {
  if (isMuted) return null;

  try {
    const audio = new Audio(url);
    audio.volume = (options.volume ?? 1) * globalVolume;
    audio.playbackRate = options.rate ?? 1;
    audio.loop = options.loop ?? false;

    audio.play().catch(() => {});
    return audio;
  } catch (error) {
    console.warn('Error playing custom sound:', error);
    return null;
  }
}

/**
 * Preload a sound effect
 */
export function preloadSound(sound: SoundEffect): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audioCache.has(sound)) {
      resolve();
      return;
    }

    const audio = new Audio(SOUND_PATHS[sound]);
    audio.preload = 'auto';

    audio.oncanplaythrough = () => {
      audioCache.set(sound, audio);
      resolve();
    };

    audio.onerror = () => {
      console.warn(`Failed to load sound: ${sound}`);
      resolve(); // Don't reject, just warn
    };

    audio.load();
  });
}

/**
 * Preload all sound effects
 */
export async function preloadAllSounds(): Promise<void> {
  const sounds = Object.keys(SOUND_PATHS) as SoundEffect[];
  await Promise.all(sounds.map(preloadSound));
}

/**
 * Preload commonly used sounds
 */
export async function preloadCommonSounds(): Promise<void> {
  const commonSounds: SoundEffect[] = [
    'click',
    'success',
    'error',
    'pop',
    'ding',
    'win',
    'lose',
  ];
  await Promise.all(commonSounds.map(preloadSound));
}

// ============ HELPER METHODS ============

/**
 * Play a sound effect
 */
export function playSound(
  sound: SoundEffect,
  options: PlaySoundOptions = {}
): HTMLAudioElement | null {
  if (isMuted) return null;

  try {
    // Create new audio instance for each play (allows overlapping)
    const audio = new Audio(SOUND_PATHS[sound]);

    // Apply settings
    audio.volume = (options.volume ?? 1) * globalVolume;
    audio.playbackRate = options.rate ?? 1;
    audio.loop = options.loop ?? false;

    // Play
    audio.play().catch(() => {
      // Ignore autoplay errors (common on first interaction)
    });

    return audio;
  } catch (error) {
    console.warn(`Error playing sound: ${sound}`, error);
    return null;
  }
}

/**
 * Stop a playing sound
 */
export function stopSound(audio: HTMLAudioElement | null): void {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

/**
 * Set the global volume
 */
export function setGlobalVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get the current global volume
 */
export function getGlobalVolume(): number {
  return globalVolume;
}

/**
 * Mute all sounds
 */
export function mute(): void {
  isMuted = true;
}

/**
 * Unmute all sounds
 */
export function unmute(): void {
  isMuted = false;
}

/**
 * Toggle mute state
 */
export function toggleMute(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

/**
 * Check if sounds are muted
 */
export function isSoundMuted(): boolean {
  return isMuted;
}

// ============ Convenience functions for common game sounds ============

/** Play click sound */
export const click = () => playSound('click', { volume: 0.6 });

/** Play success sound */
export const success = () => playSound('success');

/** Play error sound */
export const error = () => playSound('error', { volume: 0.7 });

/** Play pop sound */
export const pop = () => playSound('pop', { volume: 0.8 });

/** Play whoosh sound */
export const whoosh = () => playSound('whoosh', { volume: 0.5 });

/** Play ding sound */
export const ding = () => playSound('ding');

/** Play coin/point sound */
export const coin = () => playSound('coin');

/** Play level up sound */
export const levelUp = () => playSound('levelup');

/** Play power up sound */
export const powerUp = () => playSound('powerup');

/** Play bounce sound */
export const bounce = () => playSound('bounce', { volume: 0.6 });

/** Play catch sound */
export const catchSound = () => playSound('catch');

/** Play release sound */
export const release = () => playSound('release');

/** Play win sound */
export const win = () => playSound('win');

/** Play lose sound */
export const lose = () => playSound('lose', { volume: 0.8 });

/** Play card flip sound */
export const cardFlip = () => playSound('card_flip', { volume: 0.5 });

/** Play match sound */
export const match = () => playSound('match');

/** Play combo sound */
export const combo = () => playSound('combo');

/** Play streak sound */
export const streak = () => playSound('streak');

// ============ React Hook ============

import { useState, useCallback, useEffect } from 'react';

/**
 * React hook for sound effects
 */
export function useSounds() {
  const [muted, setMuted] = useState(isMuted);
  const [volume, setVolumeState] = useState(globalVolume);

  useEffect(() => {
    // Preload common sounds on mount
    preloadCommonSounds();
  }, []);

  const play = useCallback((sound: SoundEffect, options?: PlaySoundOptions) => {
    return playSound(sound, options);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setGlobalVolume(vol);
    setVolumeState(vol);
  }, []);

  const toggle = useCallback(() => {
    const newMuted = toggleMute();
    setMuted(newMuted);
    return newMuted;
  }, []);

  return {
    play,
    stop: stopSound,
    setVolume,
    volume,
    mute: () => { mute(); setMuted(true); },
    unmute: () => { unmute(); setMuted(false); },
    toggleMute: toggle,
    isMuted: muted,
    preloadSound,
    preloadAll: preloadAllSounds,
  };
}
