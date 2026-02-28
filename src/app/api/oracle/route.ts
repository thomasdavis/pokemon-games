import { generateText, openai } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, truthValue, pokemonTraits, playerName } = body;

    if (question === undefined || truthValue === undefined) {
      return NextResponse.json(
        { error: 'Missing question or truthValue' },
        { status: 400 }
      );
    }

    // Build context about the Pokemon without revealing its name
    const traitsContext = pokemonTraits
      ? `The hidden Pokemon has these traits: ${JSON.stringify(pokemonTraits)}.`
      : '';

    const answerHint = truthValue
      ? 'The answer is YES - hint toward this positively.'
      : 'The answer is NO - hint toward this negatively.';

    const prompt = `You are the PokéOracle, a mystical and wise oracle who speaks in playful riddles.
A child named ${playerName || 'young trainer'} is trying to guess a hidden Pokemon.

They asked: "${question}"

${answerHint}
${traitsContext}

Respond with 1-2 playful, mystical sentences that hint at whether the answer is yes or no WITHOUT:
- Saying "yes" or "no" directly
- Revealing the Pokemon's name
- Being confusing or scary

Use phrases like "The mists reveal...", "The ancient spirits whisper...", "My crystal ball shows...", etc.
Be encouraging and kid-friendly. Make the child feel like they're on an adventure!`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Oracle API error:', error);
    return NextResponse.json(
      { error: 'The Oracle\'s crystal ball is cloudy. Please try again.' },
      { status: 500 }
    );
  }
}
