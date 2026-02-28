/**
 * PokéSense AI Dialogue System
 * Calls server-side API for all AI-generated content
 */

import { Pokemon } from '@/data/pokemon';
import { SkillType } from './gameTypes';

// Helper to get ability names from Pokemon
const getAbilityNames = (pokemon: Pokemon): string[] =>
  pokemon.abilities?.map(a => a.name) || [];

// Call the AI API
async function callAI(type: string, data: Record<string, unknown>): Promise<string> {
  const response = await fetch('/api/poke-sense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  return result.text;
}

// ============ POKEDEX VOICE ============
export async function generatePokedexEntry(pokemon: Pokemon): Promise<string> {
  return callAI('pokedex', {
    name: pokemon.name,
    id: pokemon.id,
    types: pokemon.types,
    height: pokemon.height,
    weight: pokemon.weight,
    genus: pokemon.genus,
    generation: pokemon.generation,
    hp: pokemon.hp,
    attack: pokemon.attack,
    defense: pokemon.defense,
    speed: pokemon.speed,
    evolves_from: pokemon.evolves_from,
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
    abilities: getAbilityNames(pokemon),
  });
}

// Generate encounter dialogue when Pokemon appears
export async function generateEncounterDialogue(
  pokemon: Pokemon,
  playerName: string
): Promise<string> {
  return callAI('encounter', {
    pokemonName: pokemon.name,
    types: pokemon.types,
    id: pokemon.id,
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
  });
}

// Generate introduction/learning dialogue about the Pokemon
export async function generateIntroductionDialogue(
  pokemon: Pokemon,
  playerName: string
): Promise<string> {
  return callAI('introduction', {
    pokemonName: pokemon.name,
    types: pokemon.types,
    height: pokemon.height,
    weight: pokemon.weight,
    speed: pokemon.speed,
    attack: pokemon.attack,
    defense: pokemon.defense,
    evolves_from: pokemon.evolves_from,
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
    generation: pokemon.generation,
  });
}

// Generate skill challenge briefing
export async function generateSkillBriefing(
  skillType: SkillType,
  pokemon: Pokemon,
  playerName: string
): Promise<string> {
  return callAI('skillBriefing', {
    skillType,
    pokemonName: pokemon.name,
  });
}

// Generate encouragement after failed attempt
export async function generateEncouragement(
  playerName: string,
  skillType: SkillType,
  attempts: number,
  pokemon: Pokemon
): Promise<string> {
  return callAI('encouragement', {
    pokemonName: pokemon.name,
    skillType,
    attempts,
  });
}

// Generate success celebration
export async function generateSuccessCelebration(
  playerName: string,
  skillType: SkillType,
  streak: number,
  pokemon: Pokemon,
  attempts: number
): Promise<string> {
  return callAI('success', {
    playerName,
    skillType,
    streak,
    pokemonName: pokemon.name,
    attempts,
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
  });
}

// Generate catch announcement
export async function generateCatchAnnouncement(
  pokemon: Pokemon,
  playerName: string,
  totalCaught: number
): Promise<string> {
  return callAI('catch', {
    pokemonName: pokemon.name,
    playerName,
    totalCaught,
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
  });
}

// Generate detailed Pokemon facts
export async function generatePokemonFact(
  pokemon: Pokemon,
  playerName: string,
  factNumber: number
): Promise<string> {
  return callAI('fact', {
    pokemonName: pokemon.name,
    types: pokemon.types,
    height: pokemon.height,
    weight: pokemon.weight,
    generation: pokemon.generation,
    hp: pokemon.hp,
    attack: pokemon.attack,
    defense: pokemon.defense,
    speed: pokemon.speed,
    evolves_from: pokemon.evolves_from,
    abilities: getAbilityNames(pokemon),
    is_legendary: pokemon.is_legendary || false,
    is_mythical: pokemon.is_mythical || false,
    factNumber,
  });
}

// Generate session summary
export async function generateSessionSummary(
  playerName: string,
  caughtThisSession: number,
  totalCaught: number,
  streak: number,
  newAchievements: string[]
): Promise<string> {
  // This one is less commonly used, keeping simple
  return `What a session! Caught ${caughtThisSession} Pokemon. Collection now has ${totalCaught} total!`;
}

// Generate achievement announcement
export async function generateAchievementAnnouncement(
  playerName: string,
  achievementName: string,
  achievementDescription: string
): Promise<string> {
  return callAI('achievement', {
    playerName,
    achievementName,
    achievementDescription,
  });
}

// Generate type explanation
export async function generateTypeExplanation(
  type: string,
  playerName: string
): Promise<string> {
  return `${type} type Pokemon have incredible powers!`;
}

// Generate welcome back message
export async function generateWelcomeBack(
  playerName: string,
  totalCaught: number,
  lastPokemonName: string | null,
  daysSinceLastPlay: number
): Promise<string> {
  return callAI('welcomeBack', {
    playerName,
    totalCaught,
    lastPokemonName,
    daysSince: daysSinceLastPlay,
  });
}

// Generate hint during skill challenge
export async function generateHint(
  skillType: SkillType,
  playerName: string,
  attempts: number
): Promise<string> {
  return callAI('hint', {
    skillType,
    attempts,
  });
}

// Generate first-time welcome message
export async function generateFirstTimeWelcome(playerName: string): Promise<string> {
  return callAI('firstWelcome', {
    playerName,
  });
}

// Generate ready for next Pokemon message
export async function generateReadyForNext(playerName: string): Promise<string> {
  return callAI('readyNext', {});
}
