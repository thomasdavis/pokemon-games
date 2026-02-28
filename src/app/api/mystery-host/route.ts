import { generateText, openai } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clueType, clueData, playerName } = body;

    if (!clueType || clueData === undefined) {
      return NextResponse.json(
        { error: 'Missing clueType or clueData' },
        { status: 400 }
      );
    }

    const cluePrompts: Record<string, string> = {
      generation: `You are an enthusiastic game show host for kids! A Pokemon is hidden, and you're giving the first clue. The Pokemon is from Generation ${clueData} (the ${getRegionName(clueData)} region). Describe this clue in a fun, dramatic way WITHOUT revealing the Pokemon's name. Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,

      type: `You are an enthusiastic game show host for kids! The hidden Pokemon's primary type is ${clueData}. Describe this type clue in a fun way - maybe mention what ${clueData} Pokemon are known for, but DON'T name any specific Pokemon! Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,

      height: `You are an enthusiastic game show host for kids! The hidden Pokemon is ${clueData} tall (that's ${formatHeight(clueData)}). Give a fun comparison - is it shorter than you, taller than a basketball hoop? Be creative but DON'T name the Pokemon! Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,

      weight: `You are an enthusiastic game show host for kids! The hidden Pokemon weighs ${clueData} (that's ${formatWeight(clueData)}). Give a fun comparison - is it lighter than a cat, heavier than you? Be creative but DON'T name the Pokemon! Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,

      stat: `You are an enthusiastic game show host for kids! The hidden Pokemon's best stat is ${clueData}! Explain what this means for a Pokemon in a fun way - is it super fast? A real tank? A powerful attacker? DON'T name the Pokemon! Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,

      silhouette: `You are an enthusiastic game show host for kids! You're about to show the Pokemon's shadow/silhouette. Build excitement! Say something like "The moment of truth!" or "Can you guess from the shape alone?" DON'T name the Pokemon or describe its shape. Keep it to 1-2 exciting sentences. Address ${playerName || 'the player'} directly.`,
    };

    const prompt = cluePrompts[clueType];
    if (!prompt) {
      return NextResponse.json(
        { error: 'Invalid clueType' },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Mystery host API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate clue description' },
      { status: 500 }
    );
  }
}

function getRegionName(generation: string): string {
  const regions: Record<string, string> = {
    'I': 'Kanto',
    'II': 'Johto',
    'III': 'Hoenn',
    'IV': 'Sinnoh',
    'V': 'Unova',
    'VI': 'Kalos',
    'VII': 'Alola',
    'VIII': 'Galar',
    'IX': 'Paldea',
  };
  return regions[generation] || 'Pokemon';
}

function formatHeight(decimeters: number): string {
  const meters = decimeters / 10;
  const feet = Math.floor(meters * 3.281);
  const inches = Math.round((meters * 3.281 - feet) * 12);
  return `${meters.toFixed(1)} meters or about ${feet}'${inches}"`;
}

function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  const lbs = Math.round(kg * 2.205);
  return `${kg.toFixed(1)} kg or about ${lbs} pounds`;
}
