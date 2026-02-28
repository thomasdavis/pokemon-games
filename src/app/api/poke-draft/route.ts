import { generateText, openai } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rivalName, playerName, event, context } = body;

    let prompt = '';
    let responseKey = 'commentary';

    switch (event) {
      case 'opening':
        prompt = `You are ${rivalName}, a confident Pokemon trainer rival. Generate a short, playful opening taunt (1-2 sentences) to ${playerName} as you start a Pokemon draft battle. Be competitive but kid-friendly. Channel classic Pokemon rival energy.`;
        break;

      case 'player_pick':
        if (context?.isGoodPick) {
          prompt = `You are ${rivalName}, a Pokemon trainer rival. ${playerName} just drafted ${context.pokemonName} - a strong pick! Generate a short reaction (1 sentence) that's either grudgingly impressed or acts like you're not worried. Be competitive but kid-friendly.`;
        } else {
          prompt = `You are ${rivalName}, a Pokemon trainer rival. ${playerName} just drafted ${context.pokemonName}. Generate a short, playful taunt (1 sentence) about their pick. Be competitive but kid-friendly - you can tease but not be mean.`;
        }
        break;

      case 'rival_pick':
        prompt = `You are ${rivalName}, a Pokemon trainer rival. You just drafted ${context.pokemonName} for your team. Generate a short, confident boast (1 sentence) about your pick. Be competitive but kid-friendly. Show off a little!`;
        break;

      case 'battle_start':
        prompt = `You are ${rivalName}, a Pokemon trainer rival. The draft is complete and the battle is about to begin against ${playerName}. Generate a short, exciting battle cry (1 sentence) to hype up the match. Be competitive but kid-friendly.`;
        break;

      case 'battle_end':
        if (context?.winner === rivalName) {
          prompt = `You are ${rivalName}, a Pokemon trainer rival. You just won the battle against ${playerName}! Generate a short victory taunt (1-2 sentences) that's confident but not mean. Offer a rematch. Be competitive but kid-friendly.`;
        } else {
          prompt = `You are ${rivalName}, a Pokemon trainer rival. You just lost the battle to ${playerName}! Generate a short reaction (1-2 sentences) that shows you're a good sport but determined to win next time. Be competitive but kid-friendly.`;
        }
        break;

      case 'battle_narration':
        const { playerTeam, rivalTeam, winner, highlights } = context || {};
        prompt = `You are an exciting Pokemon battle announcer. Create 5 short, action-packed narration lines for a battle between these teams:

${playerName}'s team: ${playerTeam?.join(', ') || 'Unknown'}
${rivalName}'s team: ${rivalTeam?.join(', ') || 'Unknown'}
Winner: ${winner}

Base your narration on these key moments: ${highlights?.join('. ') || 'Epic battle'}

Format: Return ONLY a JSON array of 5 strings, each being one narration line. Example:
["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"]

Make it exciting, dramatic, and kid-friendly! Use Pokemon names from both teams.`;

        try {
          const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt,
          });

          // Parse the narration array
          const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
          const narration = JSON.parse(cleanText);

          return NextResponse.json({ narration });
        } catch (parseError) {
          // Fallback narration if parsing fails
          return NextResponse.json({
            narration: highlights || [
              'The battle begins!',
              'Both trainers give it their all!',
              'An intense exchange of attacks!',
              'The tide of battle shifts!',
              `${winner} emerges victorious!`,
            ],
          });
        }

      default:
        prompt = `You are ${rivalName}, a Pokemon trainer rival. Say something competitive but friendly to ${playerName}. Keep it short (1 sentence) and kid-friendly.`;
    }

    // Generate commentary for non-battle events
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    // Clean up the response (remove quotes if present)
    let commentary = text.trim();
    if (commentary.startsWith('"') && commentary.endsWith('"')) {
      commentary = commentary.slice(1, -1);
    }

    return NextResponse.json({ [responseKey]: commentary });
  } catch (error) {
    console.error('PokeDraft AI error:', error);

    // Fallback responses
    const fallbacks: Record<string, string> = {
      opening: "Let's see what you've got, trainer!",
      player_pick: 'Interesting choice... but can it beat MY team?',
      rival_pick: "This Pokemon will crush your team!",
      battle_start: "Prepare to lose!",
      battle_end: "Good battle! Let's go again!",
    };

    const event = (await request.json().catch(() => ({})))?.event || 'opening';

    return NextResponse.json({
      commentary: fallbacks[event] || "Let's battle!",
    });
  }
}
