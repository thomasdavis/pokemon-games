/**
 * Player Context Package
 *
 * Manages player information (name, preferences) stored in localStorage.
 * Provides a React context for accessing player data throughout the app.
 *
 * @example
 * // Wrap your app with PlayerProvider
 * <PlayerProvider>
 *   <App />
 * </PlayerProvider>
 *
 * @example
 * // Use the hook in any component
 * const { name, setName } = usePlayer();
 * console.log(`Hello, ${name}!`);
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// localStorage keys
const STORAGE_KEYS = {
  name: 'pokemon_player_name',
  soundEnabled: 'pokemon_sound_enabled',
  speechEnabled: 'pokemon_speech_enabled',
  volume: 'pokemon_volume',
} as const;

// Default player name
const DEFAULT_NAME = 'Trainer';

// Player data interface
export interface PlayerData {
  name: string;
  soundEnabled: boolean;
  speechEnabled: boolean;
  volume: number;
}

// Context interface
interface PlayerContextType extends PlayerData {
  setName: (name: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  resetPlayer: () => void;
  isLoaded: boolean;
}

// Default context value
const defaultContext: PlayerContextType = {
  name: DEFAULT_NAME,
  soundEnabled: true,
  speechEnabled: true,
  volume: 0.7,
  setName: () => {},
  setSoundEnabled: () => {},
  setSpeechEnabled: () => {},
  setVolume: () => {},
  resetPlayer: () => {},
  isLoaded: false,
};

// Create context
const PlayerContext = createContext<PlayerContextType>(defaultContext);

// Provider props
interface PlayerProviderProps {
  children: ReactNode;
}

/**
 * Player Provider component
 * Wrap your app with this to provide player context
 */
export function PlayerProvider({ children }: PlayerProviderProps) {
  const [name, setNameState] = useState(DEFAULT_NAME);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [speechEnabled, setSpeechEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.7);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedName = localStorage.getItem(STORAGE_KEYS.name);
      const storedSound = localStorage.getItem(STORAGE_KEYS.soundEnabled);
      const storedSpeech = localStorage.getItem(STORAGE_KEYS.speechEnabled);
      const storedVolume = localStorage.getItem(STORAGE_KEYS.volume);

      if (storedName) setNameState(storedName);
      if (storedSound !== null) setSoundEnabledState(storedSound === 'true');
      if (storedSpeech !== null) setSpeechEnabledState(storedSpeech === 'true');
      if (storedVolume) setVolumeState(parseFloat(storedVolume));
    } catch (error) {
      console.warn('Error loading player data from localStorage:', error);
    }

    setIsLoaded(true);
  }, []);

  // Save to localStorage helpers
  const setName = useCallback((newName: string) => {
    const trimmedName = newName.trim() || DEFAULT_NAME;
    setNameState(trimmedName);
    try {
      localStorage.setItem(STORAGE_KEYS.name, trimmedName);
    } catch (error) {
      console.warn('Error saving name to localStorage:', error);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.soundEnabled, String(enabled));
    } catch (error) {
      console.warn('Error saving sound setting:', error);
    }
  }, []);

  const setSpeechEnabled = useCallback((enabled: boolean) => {
    setSpeechEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.speechEnabled, String(enabled));
    } catch (error) {
      console.warn('Error saving speech setting:', error);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVol);
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(clampedVol));
    } catch (error) {
      console.warn('Error saving volume setting:', error);
    }
  }, []);

  const resetPlayer = useCallback(() => {
    setNameState(DEFAULT_NAME);
    setSoundEnabledState(true);
    setSpeechEnabledState(true);
    setVolumeState(0.7);
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Error resetting player data:', error);
    }
  }, []);

  const value: PlayerContextType = {
    name,
    soundEnabled,
    speechEnabled,
    volume,
    setName,
    setSoundEnabled,
    setSpeechEnabled,
    setVolume,
    resetPlayer,
    isLoaded,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

/**
 * Hook to access player data
 */
export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

/**
 * Get the player's display name (for use outside React)
 */
export function getPlayerName(): string {
  if (typeof window === 'undefined') return DEFAULT_NAME;
  try {
    return localStorage.getItem(STORAGE_KEYS.name) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

/**
 * Set the player's name (for use outside React)
 */
export function setPlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.name, name.trim() || DEFAULT_NAME);
  } catch (error) {
    console.warn('Error saving name:', error);
  }
}

// ============ Name Edit Component ============

interface NameEditorProps {
  className?: string;
}

/**
 * A simple inline name editor component
 */
export function NameEditor({ className = '' }: NameEditorProps) {
  const { name, setName, isLoaded } = usePlayer();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  useEffect(() => {
    setEditValue(name);
  }, [name]);

  const handleSave = () => {
    setName(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(name);
      setIsEditing(false);
    }
  };

  if (!isLoaded) {
    return <span className={className}>Loading...</span>;
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`bg-white/90 px-3 py-1 rounded-lg border-2 border-yellow-400 outline-none text-gray-800 font-bold ${className}`}
        placeholder="Your name"
        maxLength={20}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-lg hover:bg-yellow-100 transition-colors ${className}`}
      title="Click to change your name"
    >
      <span className="text-xl">👤</span>
      <span className="font-bold text-gray-800">{name}</span>
      <span className="text-xs text-gray-500">✏️</span>
    </button>
  );
}
