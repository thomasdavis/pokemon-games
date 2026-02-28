import { generateText, openai } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

interface GridCell {
  pokemonId: number;
  pokemonName: string;
  attribute: string;
  attributeValue: string;
  state: 'unknown' | 'yes' | 'no';
}

interface Clue {
  text: string;
  used: boolean;
}

interface HintRequest {
  puzzleId: string;
  gridState: GridCell[];
  clues: Clue[];
  playerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: HintRequest = await request.json();
    const { gridState, clues, playerName } = body;

    if (!gridState || !clues) {
      return NextResponse.json(
        { error: 'Missing gridState or clues' },
        { status: 400 }
      );
    }

    // Build a description of the current grid state
    const markedYes = gridState.filter(cell => cell.state === 'yes');
    const markedNo = gridState.filter(cell => cell.state === 'no');
    const unmarked = gridState.filter(cell => cell.state === 'unknown');

    const gridDescription = `
Current grid state:
- Marked as YES (confirmed matches): ${markedYes.length > 0 ? markedYes.map(c => `${c.pokemonName} has ${c.attributeValue}`).join(', ') : 'None yet'}
- Marked as NO (ruled out): ${markedNo.length > 0 ? markedNo.slice(0, 10).map(c => `${c.pokemonName} is NOT ${c.attributeValue}`).join(', ') + (markedNo.length > 10 ? ` ...and ${markedNo.length - 10} more` : '') : 'None yet'}
- Still unknown: ${unmarked.length} cells
`;

    const cluesDescription = clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n');

    const prompt = `You are a helpful puzzle assistant for a kid-friendly Pokemon logic grid puzzle game.
The player (${playerName || 'a young trainer'}) needs a hint to make progress.

Here are the clues for this puzzle:
${cluesDescription}

${gridDescription}

Based on the clues and current grid state, suggest ONE logical deduction the player can make next.
Be specific but kid-friendly. Point to a specific clue number and explain how it helps them mark a cell as yes or no.
Keep your hint to 2-3 sentences maximum. Be encouraging!

Example hints:
- "Look at clue 2! Since Pikachu must be Electric type, you can mark YES for Pikachu-Electric!"
- "Clue 4 says the Fire type is from Gen 1. Check which Pokemon could be Fire type from Gen 1!"
- "Great progress! Since you've ruled out Light for everyone except Eevee, Eevee must be Light weight!"`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    return NextResponse.json({ hint: text });
  } catch (error) {
    console.error('Logic hint API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    );
  }
}
