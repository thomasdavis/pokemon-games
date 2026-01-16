/**
 * Text-to-Speech Package
 *
 * Uses the browser's Web Speech API to add voice to games.
 * Works in all modern browsers without any external dependencies.
 *
 * This package exposes both RAW APIs for sophisticated implementations
 * and helper methods for quick implementations.
 *
 * @example
 * // RAW API - Full control over speech synthesis
 * import { speak, SpeechOptions, getVoices, loadVoices } from '@/lib/speech';
 *
 * // Dynamic Pokemon announcement based on size/rarity
 * speak(`A wild ${pokemon.name} appeared!`, {
 *   rate: pokemon.is_legendary ? 0.8 : 1.0,  // Dramatic for legendaries
 *   pitch: pokemon.height > 20 ? 0.7 : 1.2,   // Deep for large Pokemon
 *   volume: 1.0,
 *   onEnd: () => playNextDialogue(),
 * });
 *
 * @example
 * // Helper methods for quick implementations
 * announcePokemon('Pikachu');  // "It's Pikachu!"
 * sayCorrect();                 // "Correct! Great job!"
 */

// ============ RAW EXPORTS - Use these for creative, sophisticated implementations ============

// Check if speech synthesis is available
export const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Direct access to browser's speechSynthesis API
export const getSpeechSynthesis = (): SpeechSynthesis | null => {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis;
};

// Create a raw utterance for full control
export const createUtterance = (text: string): SpeechSynthesisUtterance | null => {
  if (typeof window === 'undefined') return null;
  return new SpeechSynthesisUtterance(text);
};

// Speech options interface
export interface SpeechOptions {
  /** Speech rate (0.1 to 10, default: 1) */
  rate?: number;
  /** Speech pitch (0 to 2, default: 1) */
  pitch?: number;
  /** Speech volume (0 to 1, default: 1) */
  volume?: number;
  /** Voice to use (will pick a good default if not specified) */
  voice?: SpeechSynthesisVoice;
  /** Language code (e.g., 'en-US') */
  lang?: string;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback on error */
  onError?: (error: SpeechSynthesisErrorEvent) => void;
}

// Default kid-friendly voice settings
const DEFAULT_OPTIONS: SpeechOptions = {
  rate: 0.9,      // Slightly slower for kids
  pitch: 1.1,     // Slightly higher for friendliness
  volume: 1,
  lang: 'en-US',
};

// Cache for voices
let voicesCache: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

/**
 * Load available voices (call early to ensure voices are ready)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesCache = voices;
      voicesLoaded = true;
      resolve(voices);
      return;
    }

    // Wait for voices to load
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCache = window.speechSynthesis.getVoices();
      voicesLoaded = true;
      resolve(voicesCache);
    };

    // Timeout fallback
    setTimeout(() => {
      if (!voicesLoaded) {
        voicesCache = window.speechSynthesis.getVoices();
        voicesLoaded = true;
        resolve(voicesCache);
      }
    }, 1000);
  });
}

/**
 * Get available voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported) return [];
  if (voicesCache.length === 0) {
    voicesCache = window.speechSynthesis.getVoices();
  }
  return voicesCache;
}

/**
 * Get a kid-friendly voice (prefers certain voices)
 */
export function getKidFriendlyVoice(): SpeechSynthesisVoice | undefined {
  const voices = getVoices();

  // Preferred voice names (kid-friendly, clear voices)
  const preferredVoices = [
    'Samantha',           // macOS - clear female voice
    'Karen',              // macOS - Australian female
    'Google US English',  // Chrome - clear
    'Microsoft Zira',     // Windows - female
    'Microsoft David',    // Windows - male
  ];

  for (const preferred of preferredVoices) {
    const voice = voices.find(v => v.name.includes(preferred));
    if (voice) return voice;
  }

  // Fallback to first English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

/**
 * Speak text with the Web Speech API
 */
export function speak(text: string, options: SpeechOptions = {}): SpeechSynthesisUtterance | null {
  if (!isSpeechSupported) {
    console.warn('Speech synthesis not supported in this browser');
    return null;
  }

  // Cancel any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const opts = { ...DEFAULT_OPTIONS, ...options };

  utterance.rate = opts.rate ?? 1;
  utterance.pitch = opts.pitch ?? 1;
  utterance.volume = opts.volume ?? 1;
  utterance.lang = opts.lang ?? 'en-US';

  // Set voice
  if (opts.voice) {
    utterance.voice = opts.voice;
  } else {
    const kidVoice = getKidFriendlyVoice();
    if (kidVoice) utterance.voice = kidVoice;
  }

  // Set callbacks
  if (opts.onEnd) utterance.onend = opts.onEnd;
  if (opts.onStart) utterance.onstart = opts.onStart;
  if (opts.onError) utterance.onerror = opts.onError;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any current speech
 */
export function stopSpeaking(): void {
  if (isSpeechSupported) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  if (!isSpeechSupported) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Pause current speech
 */
export function pauseSpeaking(): void {
  if (isSpeechSupported) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeaking(): void {
  if (isSpeechSupported) {
    window.speechSynthesis.resume();
  }
}

// ============ Pre-built speech functions for games ============

/**
 * Announce a Pokemon's name with excitement
 */
export function announcePokemon(name: string): void {
  speak(`It's ${name}!`, { rate: 1.0, pitch: 1.2 });
}

/**
 * Say "Correct!" with enthusiasm
 */
export function sayCorrect(): void {
  speak("Correct! Great job!", { rate: 1.1, pitch: 1.3 });
}

/**
 * Say "Wrong" gently
 */
export function sayWrong(): void {
  speak("Oops! Try again!", { rate: 0.9, pitch: 1.0 });
}

/**
 * Celebrate a win
 */
export function celebrateWin(): void {
  speak("You did it! Amazing!", { rate: 1.1, pitch: 1.3 });
}

/**
 * Encourage after a loss
 */
export function encourageAfterLoss(): void {
  speak("Good try! You'll get it next time!", { rate: 0.9, pitch: 1.1 });
}

/**
 * Announce a new high score
 */
export function announceHighScore(): void {
  speak("New high score! You're a Pokemon Master!", { rate: 1.0, pitch: 1.2 });
}

/**
 * Count down from a number
 */
export async function countdown(from: number = 3): Promise<void> {
  for (let i = from; i > 0; i--) {
    speak(i.toString(), { rate: 1.0, pitch: 1.0 });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  speak("Go!", { rate: 1.2, pitch: 1.3 });
}

/**
 * Read a hint or clue
 */
export function readHint(hint: string): void {
  speak(`Here's a hint: ${hint}`, { rate: 0.85, pitch: 1.0 });
}

/**
 * Announce the score
 */
export function announceScore(score: number): void {
  speak(`Your score is ${score}!`, { rate: 1.0, pitch: 1.1 });
}

// ============ React Hook ============

import { useState, useCallback, useEffect } from 'react';

/**
 * React hook for speech synthesis
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isSpeechSupported);
    if (isSpeechSupported) {
      loadVoices();
    }
  }, []);

  const speakText = useCallback((text: string, options: SpeechOptions = {}) => {
    const utterance = speak(text, {
      ...options,
      onStart: () => {
        setSpeaking(true);
        options.onStart?.();
      },
      onEnd: () => {
        setSpeaking(false);
        options.onEnd?.();
      },
      onError: (e) => {
        setSpeaking(false);
        options.onError?.(e);
      },
    });
    return utterance;
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  return {
    speak: speakText,
    stop,
    isSpeaking: speaking,
    isSupported: supported,
    getVoices,
    loadVoices,
  };
}
