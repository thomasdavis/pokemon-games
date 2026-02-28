/**
 * Pokemon Count AI API
 * Server-side AI generation for counting game questions and compliments.
 * Uses gpt-4.1-mini for all generations — every message is unique, never preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4.1-mini');

const NARRATOR_CONTEXT = `You are a warm, playful Pokemon professor helping kids ages 5-10 learn to count.
Your voice will be read aloud using text-to-speech.

CRITICAL RULES:
- Use simple words a 6-year-old understands
- Be ENTHUSIASTIC and FUN — use exclamations!
- Never be scary, negative, or discouraging
- NO emojis (this is for speech synthesis)
- Sound like a warm, encouraging friend

VOCABULARY VARIETY — ESSENTIAL:
Never repeat the same phrases. Rotate through varied words:
- Positive: fantastic, brilliant, superb, wonderful, incredible, spectacular, magnificent, outstanding, phenomenal, marvelous, stellar, exceptional, terrific, splendid, remarkable, extraordinary, sensational
- Counting: spot, find, count, tally, see, discover, locate, number
- Pokemon: friends, buddies, pals, creatures, companions, critters
- Excitement: wow, hooray, oh boy, how exciting, what a thrill, so cool, this is epic

Be creative and NEVER repeat the same phrasing twice!`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let result: string;

    switch (type) {
      case 'question':
        result = await generateQuestion(data);
        break;
      case 'compliment':
        result = await generateCompliment(data);
        break;
      case 'timeout':
        result = await generateTimeoutMessage(data);
        break;
      case 'welcome':
        result = await generateWelcome(data);
        break;
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    return NextResponse.json({ text: result });
  } catch (error) {
    console.error('Pokemon Count AI error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}

async function generateQuestion(data: {
  pokemonName?: string;
  isSpecificPokemon: boolean;
  difficulty: string;
  playerName: string;
  round: number;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: data.isSpecificPokemon
      ? `Round ${data.round} for ${data.playerName}! Difficulty: ${data.difficulty}.

Generate a fun, unique ONE-sentence question asking the child to count ONLY the ${data.pokemonName} among all the Pokemon on the screen.

Make it clear they should count ONLY ${data.pokemonName} and ignore the other Pokemon.

Examples of variety (but create something NEW and different every time):
- "Can you spot every single ${data.pokemonName} hiding in this crowd?"
- "How many ${data.pokemonName} are playing with their friends on the screen?"
- "Count all the ${data.pokemonName} you can find among the other Pokemon!"
- "Look carefully — how many ${data.pokemonName} are hanging out here?"

Be creative and never repeat! Just the question, nothing else.`
      : `Round ${data.round} for ${data.playerName}! Difficulty: ${data.difficulty}.

Generate a fun, unique ONE-sentence question asking the child to count ALL the Pokemon on the screen.

Examples of variety (but create something NEW and different every time):
- "How many Pokemon friends can you count on the screen?"
- "Can you tally up every single Pokemon you see?"
- "Look carefully and count all the Pokemon buddies!"
- "How many Pokemon pals are scattered across your screen?"

Be creative and never repeat! Just the question, nothing else.`,
    maxTokens: 80,
  });
  return text;
}

async function generateCompliment(data: {
  playerName: string;
  pokemonName: string;
  isCorrect: boolean;
  timeTaken: number;
  count: number;
  isSpecificPokemon: boolean;
  streak: number;
  round: number;
  difficulty: string;
}): Promise<string> {
  const seconds = Math.round(data.timeTaken);

  if (data.isCorrect) {
    const { text } = await generateText({
      model,
      system: NARRATOR_CONTEXT,
      prompt: `${data.playerName} just CORRECTLY counted ${data.count} ${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'} in ${seconds} seconds! Round ${data.round}, difficulty: ${data.difficulty}.
${data.streak > 1 ? `They're on a streak of ${data.streak} correct answers in a row!` : ''}
${seconds <= 5 ? 'That was SUPER fast!' : seconds <= 15 ? 'That was pretty quick!' : seconds <= 30 ? 'They took their time counting carefully.' : 'They were very thorough and patient.'}

Generate a unique, creative, personalized compliment in 2-3 sentences. You MUST:
- Use their name "${data.playerName}" at least once
- Mention the Pokemon (${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'})
- Mention that they did it in ${seconds} seconds
- Be genuinely excited and encouraging
- Use kid-friendly language
- NEVER repeat the same phrases — be wildly creative each time

Just the compliment, nothing else.`,
      maxTokens: 120,
    });
    return text;
  } else {
    const { text } = await generateText({
      model,
      system: NARRATOR_CONTEXT,
      prompt: `${data.playerName} tried to count ${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'} but guessed wrong after ${seconds} seconds. The correct answer was ${data.count}. Round ${data.round}.

Generate a unique, kind, encouraging message in 2-3 sentences. You MUST:
- Use their name "${data.playerName}" at least once
- Tell them the correct answer was ${data.count} ${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'}
- Mention they spent ${seconds} seconds trying
- Be supportive and motivate them to try the next round
- NEVER say "oops" or make them feel bad — this is a game they can't lose!
- Use kid-friendly language
- NEVER repeat the same phrases

Just the message, nothing else.`,
      maxTokens: 120,
    });
    return text;
  }
}

async function generateTimeoutMessage(data: {
  playerName: string;
  pokemonName: string;
  count: number;
  isSpecificPokemon: boolean;
  timeLimit: number;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `${data.playerName} ran out of time (${data.timeLimit} seconds) trying to count ${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'}. The answer was ${data.count}.

Generate a unique, warm, encouraging message in 2-3 sentences. You MUST:
- Use their name "${data.playerName}" once
- Reveal that there were ${data.count} ${data.isSpecificPokemon ? data.pokemonName : 'Pokemon'}
- Be gentle — counting lots of Pokemon is hard!
- Encourage them that the next round will be their chance to shine
- NEVER be negative — this is a learning game where nobody loses
- Use kid-friendly language

Just the message, nothing else.`,
    maxTokens: 100,
  });
  return text;
}

async function generateWelcome(data: {
  playerName: string;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Welcome ${data.playerName} to the Pokemon Counting Game!

Generate a unique, exciting 2-sentence welcome message. You MUST:
- Use their name "${data.playerName}" once
- Explain that they'll be counting Pokemon on the screen
- Make it sound like a fun adventure
- Get them pumped to start counting!
- Use kid-friendly language
- NEVER repeat — be creative every single time

Just the welcome, nothing else.`,
    maxTokens: 80,
  });
  return text;
}
