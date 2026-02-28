/**
 * PokéSense Game Engine Hook
 * Central state management and game logic
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Pokemon, pokemon, pokemonById } from '@/data/pokemon';
import { speak, cancelSpeech } from '@/lib/speech';
import { playSound } from '@/lib/sounds';
import {
  GamePhase,
  GameSession,
  SkillState,
  SkillType,
  DIFFICULTY_PRESETS,
  Achievement,
  GameEvent,
  GameEventHandler,
} from '../lib/gameTypes';
import {
  loadCaughtPokemon,
  addCaughtPokemon,
  loadStats,
  updateStats,
  recordSkillCompletion,
  recordTypeMastery,
  checkAchievements,
  loadSettings,
  saveLastSession,
  loadLastSession,
  checkAndUpdateHighScore,
} from '../lib/storage';
import {
  generateEncounterDialogue,
  generateIntroductionDialogue,
  generateSkillBriefing,
  generateEncouragement,
  generateSuccessCelebration,
  generateCatchAnnouncement,
  generatePokemonFact,
  generateAchievementAnnouncement,
  generateWelcomeBack,
  generateHint,
  generateFirstTimeWelcome,
  generateReadyForNext,
} from '../lib/dialogues';

// Available skill types for challenges
const AVAILABLE_SKILLS: SkillType[] = ['aim', 'track', 'dodge', 'typematch'];

export interface GameEngineState {
  session: GameSession;
  isLoading: boolean;
  isSpeaking: boolean;
  currentDialogue: string;
  newAchievements: Achievement[];
  sessionCatchCount: number;
  challengeStartTime: number | null;
}

export interface GameEngineActions {
  startGame: () => Promise<void>;
  startNewEncounter: () => Promise<void>;
  completeSkillChallenge: (success: boolean) => Promise<void>;
  updateSkillProgress: (progress: number) => void;
  advancePhase: () => Promise<void>;
  speakDialogue: (text: string, onEnd?: () => void) => void;
  resetGame: () => void;
  getNextFact: () => Promise<void>;
}

export function useGameEngine(playerName: string): [GameEngineState, GameEngineActions] {
  // Core game state
  const [session, setSession] = useState<GameSession>({
    phase: 'title',
    currentPokemon: null,
    caughtPokemon: [],
    currentSkill: null,
    difficulty: DIFFICULTY_PRESETS.easy,
    streak: 0,
    totalAttempts: 0,
    sessionStartTime: Date.now(),
    bonusMultiplier: 1,
    achievements: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState('');
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [sessionCatchCount, setSessionCatchCount] = useState(0);
  const [challengeStartTime, setChallengeStartTime] = useState<number | null>(null);
  const [factIndex, setFactIndex] = useState(0);

  // Event handlers ref
  const eventHandlers = useRef<GameEventHandler[]>([]);

  // Emit game event
  const emitEvent = useCallback((event: GameEvent) => {
    eventHandlers.current.forEach(handler => handler(event));
  }, []);

  // Speak dialogue with state tracking
  const speakDialogue = useCallback((text: string, onEnd?: () => void) => {
    setCurrentDialogue(text);
    setIsSpeaking(true);
    speak(text, {
      rate: 0.95,
      onEnd: () => {
        setIsSpeaking(false);
        onEnd?.();
      },
    });
  }, []);

  // Initialize game from storage
  useEffect(() => {
    const settings = loadSettings();
    const difficulty = DIFFICULTY_PRESETS[settings.difficulty] || DIFFICULTY_PRESETS.easy;
    const caughtIds = loadCaughtPokemon();
    const caughtList = caughtIds.map(id => pokemonById.get(id)).filter(Boolean) as Pokemon[];

    setSession(prev => ({
      ...prev,
      difficulty,
      caughtPokemon: caughtList,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  // Pick a random Pokemon (preferring uncaught)
  const pickRandomPokemon = useCallback((): Pokemon => {
    const caughtIds = new Set(session.caughtPokemon.map(p => p.id));
    const uncaught = pokemon.filter(p => !caughtIds.has(p.id));
    const pool = uncaught.length > 0 ? uncaught : pokemon;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [session.caughtPokemon]);

  // Pick a random skill type
  const pickRandomSkill = useCallback((): SkillType => {
    return AVAILABLE_SKILLS[Math.floor(Math.random() * AVAILABLE_SKILLS.length)];
  }, []);

  // Start the game (from title screen)
  const startGame = useCallback(async () => {
    setIsLoading(true);
    playSound('powerup');

    // Check if returning player
    const lastSession = loadLastSession();
    const stats = loadStats();
    const caughtIds = loadCaughtPokemon();

    if (lastSession && caughtIds.length > 0) {
      const daysSince = Math.floor((Date.now() - lastSession.timestamp) / (1000 * 60 * 60 * 24));
      const lastPokemon = lastSession.lastPokemonId ? pokemonById.get(lastSession.lastPokemonId) : null;

      try {
        const welcomeText = await generateWelcomeBack(
          playerName,
          caughtIds.length,
          lastPokemon?.name || null,
          daysSince
        );
        speakDialogue(welcomeText, async () => {
          setIsLoading(false);
          await startNewEncounter();
        });
      } catch {
        setIsLoading(false);
        await startNewEncounter();
      }
    } else {
      // First time player - generate unique welcome
      try {
        const welcomeText = await generateFirstTimeWelcome(playerName);
        speakDialogue(welcomeText, async () => {
          setIsLoading(false);
          await startNewEncounter();
        });
      } catch {
        // AI failed, just proceed to encounter
        setIsLoading(false);
        await startNewEncounter();
      }
    }

    // Update session count
    updateStats({ sessionsPlayed: stats.sessionsPlayed + 1 });
  }, [playerName, speakDialogue]);

  // Start a new Pokemon encounter
  const startNewEncounter = useCallback(async () => {
    setIsLoading(true);
    cancelSpeech();

    const newPokemon = pickRandomPokemon();

    setSession(prev => ({
      ...prev,
      phase: 'encounter',
      currentPokemon: newPokemon,
      currentSkill: null,
    }));

    playSound('whoosh');
    emitEvent({ type: 'POKEMON_APPEARED', pokemon: newPokemon });

    // Clear loading immediately after Pokemon appears - don't wait for speech
    setIsLoading(false);

    try {
      // Generate and speak encounter dialogue
      const encounterText = await generateEncounterDialogue(newPokemon, playerName);
      speakDialogue(encounterText, async () => {
        // Move to introduction phase
        setSession(prev => ({ ...prev, phase: 'introduction' }));

        const introText = await generateIntroductionDialogue(newPokemon, playerName);
        speakDialogue(introText, () => {
          // Auto-advance to skill briefing
          startSkillChallenge(newPokemon);
        });
      });
    } catch (error) {
      console.error('Dialogue generation error:', error);
      startSkillChallenge(newPokemon);
    }
  }, [pickRandomPokemon, playerName, speakDialogue, emitEvent]);

  // Start a skill challenge
  const startSkillChallenge = useCallback(async (poke: Pokemon) => {
    const skillType = pickRandomSkill();

    const skillState: SkillState = {
      type: skillType,
      progress: 0,
      attempts: 0,
      maxAttempts: 10,
      isActive: false,
    };

    setSession(prev => ({
      ...prev,
      phase: 'skill_briefing',
      currentSkill: skillState,
    }));

    playSound('ding');

    try {
      const briefingText = await generateSkillBriefing(skillType, poke, playerName);
      speakDialogue(briefingText, () => {
        // Activate the skill challenge
        setSession(prev => ({
          ...prev,
          phase: 'skill_active',
          currentSkill: prev.currentSkill ? { ...prev.currentSkill, isActive: true } : null,
        }));
        setChallengeStartTime(Date.now());
        emitEvent({ type: 'SKILL_STARTED', skill: skillType });
      });
    } catch {
      setSession(prev => ({
        ...prev,
        phase: 'skill_active',
        currentSkill: prev.currentSkill ? { ...prev.currentSkill, isActive: true } : null,
      }));
      setChallengeStartTime(Date.now());
    }
  }, [pickRandomSkill, playerName, speakDialogue, emitEvent]);

  // Update skill progress
  const updateSkillProgress = useCallback((progress: number) => {
    setSession(prev => ({
      ...prev,
      currentSkill: prev.currentSkill ? { ...prev.currentSkill, progress } : null,
    }));
    emitEvent({ type: 'SKILL_PROGRESS', progress });
  }, [emitEvent]);

  // Complete skill challenge (success or failure)
  const completeSkillChallenge = useCallback(async (success: boolean) => {
    if (!session.currentPokemon || !session.currentSkill) return;

    const catchTime = challengeStartTime ? Date.now() - challengeStartTime : 0;
    const poke = session.currentPokemon;
    const skill = session.currentSkill;

    if (success) {
      playSound('catch');
      emitEvent({ type: 'SKILL_SUCCESS' });

      // Record skill completion
      recordSkillCompletion(skill.type);
      if (skill.type === 'typematch') {
        recordTypeMastery(poke.types[0]);
      }

      // Update streak
      const newStreak = session.streak + 1;
      const stats = updateStats({
        currentStreak: newStreak,
        longestStreak: Math.max(loadStats().longestStreak, newStreak),
        totalCatches: loadStats().totalCatches + 1,
        fastestCatch: Math.min(loadStats().fastestCatch, catchTime),
      });

      // Check for high scores
      checkAndUpdateHighScore('longestStreak', newStreak);
      checkAndUpdateHighScore('fastestCatch', catchTime, true);

      setSession(prev => ({
        ...prev,
        phase: 'skill_success',
        streak: newStreak,
        currentSkill: { ...skill, isActive: false },
      }));

      try {
        const successText = await generateSuccessCelebration(
          playerName,
          skill.type,
          newStreak,
          poke,
          skill.attempts + 1
        );
        speakDialogue(successText, () => {
          // Move to catching phase
          catchPokemon(poke, catchTime);
        });
      } catch {
        catchPokemon(poke, catchTime);
      }
    } else {
      playSound('whoosh');
      emitEvent({ type: 'SKILL_FAILED' });

      const newAttempts = skill.attempts + 1;
      updateStats({ totalAttempts: loadStats().totalAttempts + 1 });

      setSession(prev => ({
        ...prev,
        currentSkill: { ...skill, attempts: newAttempts },
      }));

      try {
        // Give encouragement or hint
        const shouldGiveHint = newAttempts >= 3 && newAttempts % 2 === 1;

        if (shouldGiveHint) {
          const hintText = await generateHint(skill.type, playerName, newAttempts);
          speakDialogue(hintText);
        } else {
          const encourageText = await generateEncouragement(playerName, skill.type, newAttempts, poke);
          speakDialogue(encourageText);
        }
      } catch {
        // AI failed, continue silently
      }
    }
  }, [session, playerName, speakDialogue, emitEvent, challengeStartTime]);

  // Catch the Pokemon
  const catchPokemon = useCallback(async (poke: Pokemon, catchTime: number) => {
    playSound('win');

    setSession(prev => ({ ...prev, phase: 'catching' }));

    // Add to collection
    const caughtIds = addCaughtPokemon(poke.id);
    const caughtList = caughtIds.map(id => pokemonById.get(id)).filter(Boolean) as Pokemon[];

    setSession(prev => ({
      ...prev,
      caughtPokemon: caughtList,
    }));
    setSessionCatchCount(prev => prev + 1);

    // Check achievements
    const stats = loadStats();
    const achievements = checkAchievements(
      caughtIds,
      stats,
      poke.is_legendary || false,
      poke.is_mythical || false,
      catchTime
    );

    if (achievements.length > 0) {
      setNewAchievements(achievements);
    }

    emitEvent({ type: 'POKEMON_CAUGHT', pokemon: poke });

    // Save last session
    saveLastSession({
      timestamp: Date.now(),
      caughtCount: sessionCatchCount + 1,
      lastPokemonId: poke.id,
      streak: session.streak + 1,
    });

    try {
      const catchText = await generateCatchAnnouncement(poke, playerName, caughtIds.length);
      speakDialogue(catchText, () => {
        setSession(prev => ({ ...prev, phase: 'caught' }));

        // Announce achievements if any
        if (achievements.length > 0) {
          announceAchievements(achievements, 0, () => {
            setSession(prev => ({ ...prev, phase: 'details' }));
            setFactIndex(0);
            showPokemonFact(poke, 0);
          });
        } else {
          setSession(prev => ({ ...prev, phase: 'details' }));
          setFactIndex(0);
          showPokemonFact(poke, 0);
        }
      });
    } catch {
      setSession(prev => ({ ...prev, phase: 'details' }));
      setFactIndex(0);
    }
  }, [playerName, speakDialogue, emitEvent, sessionCatchCount, session.streak]);

  // Announce achievements recursively
  const announceAchievements = useCallback(async (
    achievements: Achievement[],
    index: number,
    onComplete: () => void
  ) => {
    if (index >= achievements.length) {
      onComplete();
      return;
    }

    const achievement = achievements[index];
    playSound('combo');
    emitEvent({ type: 'ACHIEVEMENT_UNLOCKED', achievement });

    try {
      const text = await generateAchievementAnnouncement(
        playerName,
        achievement.name,
        achievement.description
      );
      speakDialogue(text, () => {
        announceAchievements(achievements, index + 1, onComplete);
      });
    } catch {
      announceAchievements(achievements, index + 1, onComplete);
    }
  }, [playerName, speakDialogue, emitEvent]);

  // Show Pokemon fact
  const showPokemonFact = useCallback(async (poke: Pokemon, index: number) => {
    try {
      const factText = await generatePokemonFact(poke, playerName, index);
      playSound('pop');
      speakDialogue(factText);
    } catch {
      // AI failed, continue silently
    }
  }, [playerName, speakDialogue]);

  // Get next fact
  const getNextFact = useCallback(async () => {
    if (!session.currentPokemon) return;

    const nextIndex = factIndex + 1;
    if (nextIndex >= 5) {
      // Done with facts, move to summary
      setSession(prev => ({ ...prev, phase: 'summary' }));
      try {
        const readyText = await generateReadyForNext(playerName);
        speakDialogue(readyText, () => {});
      } catch {
        // AI failed, continue silently
      }
    } else {
      setFactIndex(nextIndex);
      showPokemonFact(session.currentPokemon, nextIndex);
    }
  }, [session.currentPokemon, factIndex, playerName, speakDialogue, showPokemonFact]);

  // Advance to next phase
  const advancePhase = useCallback(async () => {
    switch (session.phase) {
      case 'details':
        await getNextFact();
        break;
      case 'summary':
        await startNewEncounter();
        break;
      default:
        break;
    }
  }, [session.phase, getNextFact, startNewEncounter]);

  // Reset game
  const resetGame = useCallback(() => {
    cancelSpeech();
    setSession({
      phase: 'title',
      currentPokemon: null,
      caughtPokemon: [],
      currentSkill: null,
      difficulty: DIFFICULTY_PRESETS.easy,
      streak: 0,
      totalAttempts: 0,
      sessionStartTime: Date.now(),
      bonusMultiplier: 1,
      achievements: [],
    });
    setSessionCatchCount(0);
    setNewAchievements([]);
    setFactIndex(0);
    setChallengeStartTime(null);
  }, []);

  const state: GameEngineState = {
    session,
    isLoading,
    isSpeaking,
    currentDialogue,
    newAchievements,
    sessionCatchCount,
    challengeStartTime,
  };

  const actions: GameEngineActions = {
    startGame,
    startNewEncounter,
    completeSkillChallenge,
    updateSkillProgress,
    advancePhase,
    speakDialogue,
    resetGame,
    getNextFact,
  };

  return [state, actions];
}
