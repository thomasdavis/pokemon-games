/**
 * AI Generation Package
 *
 * Uses Vercel AI SDK with OpenAI to generate structured data for games.
 * Requires OPENAI_API_KEY in environment variables.
 *
 * @example
 * // Generate a fun fact about a Pokemon
 * const fact = await generatePokemonFact("Pikachu", "electric");
 *
 * @example
 * // Generate quiz questions
 * const questions = await generateQuizQuestions("Charizard");
 *
 * @example
 * // Generate encouraging message for kids
 * const message = await generateEncouragement("winning");
 */

import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Default model for all generations
const DEFAULT_MODEL = openai('gpt-4o-mini');

/**
 * Schema for Pokemon fun facts
 */
const PokemonFactSchema = z.object({
  fact: z.string().describe('A fun, kid-friendly fact about the Pokemon'),
  emoji: z.string().describe('A relevant emoji for the fact'),
});

/**
 * Schema for quiz questions
 */
const QuizQuestionSchema = z.object({
  question: z.string().describe('A fun question about the Pokemon'),
  correctAnswer: z.string().describe('The correct answer'),
  wrongAnswers: z.array(z.string()).describe('3 wrong but plausible answers'),
  hint: z.string().describe('A helpful hint for kids'),
});

/**
 * Schema for encouragement messages
 */
const EncouragementSchema = z.object({
  message: z.string().describe('An encouraging message for a child'),
  emoji: z.string().describe('A fun emoji to go with the message'),
});

/**
 * Schema for Pokemon battle commentary
 */
const BattleCommentarySchema = z.object({
  commentary: z.string().describe('Exciting battle commentary for kids'),
  excitement: z.enum(['low', 'medium', 'high']).describe('How exciting the moment is'),
});

/**
 * Schema for Pokemon descriptions
 */
const PokemonDescriptionSchema = z.object({
  description: z.string().describe('A kid-friendly description of the Pokemon'),
  personality: z.string().describe('What personality this Pokemon might have'),
  funFact: z.string().describe('An interesting fact kids would enjoy'),
});

/**
 * Generate a fun fact about a Pokemon
 */
export async function generatePokemonFact(
  pokemonName: string,
  types: string[]
): Promise<{ fact: string; emoji: string }> {
  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: PokemonFactSchema,
    prompt: `Generate a fun, kid-friendly fact about ${pokemonName}, a ${types.join('/')} type Pokemon.
             Keep it simple, exciting, and educational. The fact should be 1-2 sentences.`,
  });
  return object;
}

/**
 * Generate quiz questions about a Pokemon
 */
export async function generateQuizQuestions(
  pokemonName: string,
  pokemonTypes: string[],
  count: number = 1
): Promise<Array<{
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  hint: string;
}>> {
  const questions = [];

  for (let i = 0; i < count; i++) {
    const { object } = await generateObject({
      model: DEFAULT_MODEL,
      schema: QuizQuestionSchema,
      prompt: `Generate a fun quiz question about ${pokemonName} (${pokemonTypes.join('/')} type) for kids aged 5-10.
               The question should be about Pokemon facts, abilities, or characteristics.
               Make it educational but fun!`,
    });
    questions.push(object);
  }

  return questions;
}

/**
 * Generate an encouraging message based on game context
 */
export async function generateEncouragement(
  context: 'winning' | 'losing' | 'trying' | 'new_record' | 'streak'
): Promise<{ message: string; emoji: string }> {
  const contextMessages = {
    winning: 'The player just won! Celebrate their victory.',
    losing: 'The player just lost. Encourage them to try again.',
    trying: 'The player is working hard. Motivate them to keep going.',
    new_record: 'The player set a new high score! Make it special.',
    streak: 'The player is on a winning streak! Keep the energy high.',
  };

  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: EncouragementSchema,
    prompt: `Generate a short, encouraging message for a child playing a Pokemon game.
             Context: ${contextMessages[context]}
             Keep it positive, fun, and under 15 words. Use Pokemon-themed language!`,
  });
  return object;
}

/**
 * Generate battle commentary for catching games
 */
export async function generateBattleCommentary(
  pokemonName: string,
  action: 'appeared' | 'caught' | 'escaped' | 'legendary_appeared'
): Promise<{ commentary: string; excitement: 'low' | 'medium' | 'high' }> {
  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: BattleCommentarySchema,
    prompt: `Generate exciting Pokemon battle commentary for kids.
             Pokemon: ${pokemonName}
             Action: ${action}
             Keep it short (1 sentence), exciting, and kid-friendly!`,
  });
  return object;
}

/**
 * Generate a kid-friendly Pokemon description
 */
export async function generatePokemonDescription(
  pokemonName: string,
  types: string[],
  genus: string
): Promise<{
  description: string;
  personality: string;
  funFact: string;
}> {
  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: PokemonDescriptionSchema,
    prompt: `Create a fun, kid-friendly description for ${pokemonName}.
             Types: ${types.join('/')}
             Category: ${genus}
             Make it engaging for children aged 5-10. Keep each part to 1-2 sentences.`,
  });
  return object;
}

/**
 * Generate simple text (no structured output)
 */
export async function generateSimpleText(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: DEFAULT_MODEL,
    prompt: `You are a friendly Pokemon expert talking to kids aged 5-10.
             Keep responses short, fun, and easy to understand.

             ${prompt}`,
  });
  return text;
}

/**
 * Generate a hint for a guessing game
 */
export async function generateHint(
  pokemonName: string,
  types: string[],
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<string> {
  const difficultyGuide = {
    easy: 'Give an obvious hint that makes it easy to guess.',
    medium: 'Give a moderate hint that requires some Pokemon knowledge.',
    hard: 'Give a subtle hint that only true Pokemon fans would understand.',
  };

  const { text } = await generateText({
    model: DEFAULT_MODEL,
    prompt: `Generate a hint for guessing the Pokemon "${pokemonName}" (${types.join('/')} type).
             Difficulty: ${difficultyGuide[difficulty]}
             Keep the hint to one short sentence. Don't mention the Pokemon's name!`,
  });
  return text;
}

// ============ Personalized Messages ============

/**
 * Schema for personalized messages
 */
const PersonalizedMessageSchema = z.object({
  message: z.string().describe('A personalized, encouraging message'),
  emoji: z.string().describe('A fun emoji to go with the message'),
});

export type GameEvent =
  | 'caught_pokemon'
  | 'won_game'
  | 'lost_game'
  | 'new_high_score'
  | 'streak'
  | 'completed_quiz'
  | 'found_match'
  | 'evolution_complete'
  | 'fed_pokemon'
  | 'correct_answer'
  | 'wrong_answer'
  | 'game_start'
  | 'level_up';

/**
 * Generate a personalized message for a player
 */
export async function generatePersonalizedMessage(
  playerName: string,
  event: GameEvent,
  context?: {
    pokemonName?: string;
    score?: number;
    streak?: number;
  }
): Promise<{ message: string; emoji: string }> {
  const eventDescriptions: Record<GameEvent, string> = {
    caught_pokemon: `${playerName} just caught ${context?.pokemonName || 'a Pokemon'}!`,
    won_game: `${playerName} just won the game${context?.score ? ` with a score of ${context.score}` : ''}!`,
    lost_game: `${playerName} just lost the game. Encourage them to try again.`,
    new_high_score: `${playerName} got a new high score of ${context?.score || 'many points'}!`,
    streak: `${playerName} is on a ${context?.streak || ''} streak!`,
    completed_quiz: `${playerName} completed the quiz${context?.score ? ` with ${context.score} correct` : ''}!`,
    found_match: `${playerName} found a matching pair!`,
    evolution_complete: `${playerName} completed the ${context?.pokemonName || 'Pokemon'} evolution chain!`,
    fed_pokemon: `${playerName} made ${context?.pokemonName || 'a Pokemon'} happy by feeding it!`,
    correct_answer: `${playerName} got the answer right!`,
    wrong_answer: `${playerName} got it wrong but should try again.`,
    game_start: `${playerName} is starting a new game!`,
    level_up: `${playerName} leveled up!`,
  };

  const { object } = await generateObject({
    model: DEFAULT_MODEL,
    schema: PersonalizedMessageSchema,
    prompt: `Generate a short, fun, personalized message for a child playing a Pokemon game.
             Situation: ${eventDescriptions[event]}

             Requirements:
             - Use their name "${playerName}" in the message
             - Keep it under 15 words
             - Make it exciting and encouraging
             - Use Pokemon-themed language
             - Be kid-friendly (ages 5-10)`,
  });

  return object;
}

/**
 * Generate a quick personalized message (non-AI, instant)
 * Use this when you don't want to wait for AI generation
 */
export function getQuickPersonalizedMessage(
  playerName: string,
  event: GameEvent,
  context?: {
    pokemonName?: string;
    score?: number;
    streak?: number;
  }
): { message: string; emoji: string } {
  const messages: Record<GameEvent, { messages: string[]; emojis: string[] }> = {
    caught_pokemon: {
      messages: [
        `Amazing catch, ${playerName}!`,
        `${playerName} caught ${context?.pokemonName || 'it'}!`,
        `Great job, ${playerName}!`,
        `${playerName} is a Pokemon master!`,
      ],
      emojis: ['🎉', '⭐', '🏆', '✨'],
    },
    won_game: {
      messages: [
        `${playerName} wins! Amazing!`,
        `Victory for ${playerName}!`,
        `${playerName} is the champion!`,
        `Incredible, ${playerName}!`,
      ],
      emojis: ['🏆', '🎉', '⭐', '👑'],
    },
    lost_game: {
      messages: [
        `Great try, ${playerName}!`,
        `You'll get it, ${playerName}!`,
        `Keep going, ${playerName}!`,
        `Almost there, ${playerName}!`,
      ],
      emojis: ['💪', '🌟', '👍', '🔥'],
    },
    new_high_score: {
      messages: [
        `New record, ${playerName}!`,
        `${playerName} is #1!`,
        `Best score ever, ${playerName}!`,
        `${playerName} broke the record!`,
      ],
      emojis: ['🏆', '🥇', '⭐', '🎊'],
    },
    streak: {
      messages: [
        `${playerName} is on fire!`,
        `Unstoppable, ${playerName}!`,
        `${context?.streak} in a row, ${playerName}!`,
        `Keep it up, ${playerName}!`,
      ],
      emojis: ['🔥', '⚡', '💫', '🌟'],
    },
    completed_quiz: {
      messages: [
        `Smart work, ${playerName}!`,
        `${playerName} knows Pokemon!`,
        `Quiz master ${playerName}!`,
        `Great knowledge, ${playerName}!`,
      ],
      emojis: ['🧠', '📚', '⭐', '✨'],
    },
    found_match: {
      messages: [
        `Nice find, ${playerName}!`,
        `${playerName} found a match!`,
        `Great memory, ${playerName}!`,
        `Perfect, ${playerName}!`,
      ],
      emojis: ['🎯', '✨', '💫', '🌟'],
    },
    evolution_complete: {
      messages: [
        `${playerName} evolved it!`,
        `Evolution master, ${playerName}!`,
        `Amazing, ${playerName}!`,
        `${playerName} did it!`,
      ],
      emojis: ['✨', '🌟', '⬆️', '🎉'],
    },
    fed_pokemon: {
      messages: [
        `${context?.pokemonName || 'Pokemon'} loves ${playerName}!`,
        `So caring, ${playerName}!`,
        `Happy Pokemon, ${playerName}!`,
        `Yummy! Thanks, ${playerName}!`,
      ],
      emojis: ['❤️', '😊', '🍎', '💕'],
    },
    correct_answer: {
      messages: [
        `Correct, ${playerName}!`,
        `${playerName} got it!`,
        `Right answer, ${playerName}!`,
        `Smart, ${playerName}!`,
      ],
      emojis: ['✅', '🎯', '⭐', '👏'],
    },
    wrong_answer: {
      messages: [
        `Try again, ${playerName}!`,
        `Almost, ${playerName}!`,
        `Next time, ${playerName}!`,
        `Keep trying, ${playerName}!`,
      ],
      emojis: ['💪', '🤔', '🔄', '👍'],
    },
    game_start: {
      messages: [
        `Go, ${playerName}!`,
        `Good luck, ${playerName}!`,
        `${playerName}'s adventure begins!`,
        `Let's go, ${playerName}!`,
      ],
      emojis: ['🎮', '🚀', '⭐', '🎯'],
    },
    level_up: {
      messages: [
        `Level up, ${playerName}!`,
        `${playerName} got stronger!`,
        `New level, ${playerName}!`,
        `${playerName} powered up!`,
      ],
      emojis: ['⬆️', '💪', '🌟', '🔥'],
    },
  };

  const eventData = messages[event];
  const randomIndex = Math.floor(Math.random() * eventData.messages.length);

  return {
    message: eventData.messages[randomIndex],
    emoji: eventData.emojis[randomIndex],
  };
}
