/**
 * PokéSense Game Types
 * Core type definitions for the game engine
 */

import { Pokemon } from '@/data/pokemon';

// Game phase state machine
export type GamePhase =
  | 'title'           // Title screen
  | 'encounter'       // Wild Pokemon appears
  | 'introduction'    // Learning about the Pokemon
  | 'skill_briefing'  // Explaining the challenge
  | 'skill_active'    // Playing the skill challenge
  | 'skill_success'   // Challenge completed
  | 'catching'        // Pokeball animation
  | 'caught'          // Celebration
  | 'details'         // Showing Pokemon info
  | 'summary'         // Session summary
  | 'bonus_round';    // Special bonus challenges

// Skill challenge types
export type SkillType =
  | 'aim'        // Ring timing
  | 'track'      // Follow with cursor
  | 'dodge'      // Avoid obstacles
  | 'typematch'  // Drag correct type
  | 'sequence'   // Remember and repeat
  | 'speedcatch' // Quick reactions
  | 'puzzle';    // Arrange pieces

// Difficulty settings
export interface DifficultySettings {
  ringSpeed: number;       // For aim challenge
  ringSize: number;        // For aim challenge
  trackTime: number;       // Seconds to track
  obstacleCount: number;   // For dodge challenge
  obstacleSpeed: number;   // For dodge challenge
  typeOptionsCount: number; // Number of type choices
  encouragementFrequency: number; // How often to encourage
}

export const DIFFICULTY_PRESETS: Record<string, DifficultySettings> = {
  easy: {
    ringSpeed: 0.015,
    ringSize: 140,
    trackTime: 2,
    obstacleCount: 2,
    obstacleSpeed: 0.5,
    typeOptionsCount: 3,
    encouragementFrequency: 3,
  },
  medium: {
    ringSpeed: 0.025,
    ringSize: 110,
    trackTime: 3,
    obstacleCount: 4,
    obstacleSpeed: 1,
    typeOptionsCount: 4,
    encouragementFrequency: 4,
  },
  hard: {
    ringSpeed: 0.035,
    ringSize: 80,
    trackTime: 4,
    obstacleCount: 6,
    obstacleSpeed: 1.5,
    typeOptionsCount: 5,
    encouragementFrequency: 5,
  },
};

// Skill challenge state
export interface SkillState {
  type: SkillType;
  progress: number;        // 0-100
  attempts: number;
  maxAttempts: number;
  timeRemaining?: number;
  isActive: boolean;
  customData?: Record<string, unknown>;
}

// Game session state
export interface GameSession {
  phase: GamePhase;
  currentPokemon: Pokemon | null;
  caughtPokemon: Pokemon[];
  currentSkill: SkillState | null;
  difficulty: DifficultySettings;
  streak: number;           // Consecutive catches
  totalAttempts: number;
  sessionStartTime: number;
  bonusMultiplier: number;
  achievements: Achievement[];
}

// Achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_catch', name: 'First Catch!', description: 'Caught your first Pokémon', icon: '🎉' },
  { id: 'type_master', name: 'Type Master', description: 'Got 5 type matches correct', icon: '🏆' },
  { id: 'streak_3', name: 'On Fire!', description: 'Caught 3 Pokémon in a row', icon: '🔥' },
  { id: 'streak_5', name: 'Unstoppable!', description: 'Caught 5 Pokémon in a row', icon: '⚡' },
  { id: 'legendary', name: 'Legend Hunter', description: 'Caught a Legendary Pokémon', icon: '👑' },
  { id: 'mythical', name: 'Myth Seeker', description: 'Caught a Mythical Pokémon', icon: '✨' },
  { id: 'speedster', name: 'Speedster', description: 'Completed a challenge in under 2 seconds', icon: '💨' },
  { id: 'persistent', name: 'Never Give Up', description: 'Succeeded after 3 attempts', icon: '💪' },
  { id: 'collector_10', name: 'Collector', description: 'Caught 10 different Pokémon', icon: '📚' },
  { id: 'collector_50', name: 'Super Collector', description: 'Caught 50 different Pokémon', icon: '🌟' },
];

// Particle configuration
export interface ParticleConfig {
  emoji: string;
  count: number;
  speed: number;
  size: number;
  opacity: number;
  rotationSpeed: number;
}

// Background theme
export interface BackgroundTheme {
  gradient: string;
  particles: ParticleConfig[];
  ambientColor: string;
  glowColor: string;
  atmosphere: string;
  musicMood: 'calm' | 'exciting' | 'mysterious' | 'epic';
}

// Dialogue entry
export interface DialogueEntry {
  text: string;
  rate?: number;
  pitch?: number;
  pause?: number; // ms pause after
  emotion?: 'excited' | 'calm' | 'encouraging' | 'dramatic' | 'playful';
}

// Event system for game events
export type GameEvent =
  | { type: 'POKEMON_APPEARED'; pokemon: Pokemon }
  | { type: 'SKILL_STARTED'; skill: SkillType }
  | { type: 'SKILL_PROGRESS'; progress: number }
  | { type: 'SKILL_SUCCESS' }
  | { type: 'SKILL_FAILED' }
  | { type: 'POKEMON_CAUGHT'; pokemon: Pokemon }
  | { type: 'ACHIEVEMENT_UNLOCKED'; achievement: Achievement }
  | { type: 'STREAK_INCREASED'; streak: number }
  | { type: 'BONUS_ACTIVATED' };

export type GameEventHandler = (event: GameEvent) => void;
