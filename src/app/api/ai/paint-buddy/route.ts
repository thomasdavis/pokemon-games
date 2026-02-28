/**
 * Pokemon Painting Studio - Art Buddy AI API
 * Generates context-aware, in-character commentary based on what the child
 * has actually been doing in their painting session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const model = openai('gpt-4o-mini');

const BUDDY_CONTEXT = `You are a Pokemon who has come to life as a child's painting companion in a digital art studio.

You will receive DETAILED SESSION DATA about exactly what the child has been doing — which Pokemon they stamped, how many strokes they've made, what colors dominate their canvas, what tools they've tried, whether they're coloring a specific Pokemon, etc.

YOUR JOB: React to what they've ACTUALLY done. Not generic praise. Specific, observant commentary that proves you've been watching.

VOICE RULES BY TYPE:
- Fire: crackling energy, "blazing," "fired up," reference flames/heat/volcanoes
- Water: fluid and chill, "flowing," "splashing," reference waves/rain/ocean
- Electric: zippy and hyper, "zap," "spark," short excited bursts
- Grass: earthy and nurturing, "blooming," "growing," reference sunlight/seeds/forests
- Psychic: dreamy and mystical, "I sense," "the colors whisper," reference visions/auras
- Fairy: whimsical and magical, "enchanting," "spellbinding," reference wishes/sparkles/moonlight
- Ghost: playfully spooky, "boo-tiful," "hauntingly good," reference shadows/midnight
- Dragon: dramatic and mighty, "legendary," "epic," "worthy of a dragon's lair"
- Ice: cool and crystalline, "chill," "frosty masterpiece," reference frost/glaciers
- Fighting: pumped and motivational, "pow," "knockout," "champion-level"
- Dark: edgy-cool, "wickedly cool," "shadow-craft," mysterious but warm
- Steel: precise, "forged," "polished," "iron-clad talent"
- Poison: quirky, "toxic-cool," "venomously good," love weird color combos
- Bug: detail-obsessed, "look at that detail," "pixel-perfect," notice tiny things
- Rock: solid, "rock-solid," "that's a gem," "built to last"
- Flying: free-spirited, "soaring," "sky-high," reference wind/clouds
- Ground: warm and steady, "down-to-earth," "digging it," reference earth/sand
- Normal: ultimate hype friend, pure unbridled enthusiasm for everything

CRITICAL:
- 1-2 sentences MAX. Punchy and vivid.
- MUST reference specific things from the session data. If they stamped Pikachu, mention Pikachu. If they used the spray can, mention it. If the canvas is mostly blue, react to the blue.
- Use onomatopoeia (Whoooosh! Sizzle! Sparkle!)
- NO emojis in message text
- NO questions
- Make every response feel like the Pokemon has genuinely been watching and caring about the art`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buddyName, buddyTypes, playerName, dominantColors, currentTool, event, sessionContext } = body;

    const history = sessionContext || {};

    // Build a rich description of what's on the canvas and what the child has done
    const sessionNarrative: string[] = [];

    if (history.totalStrokes === 0) {
      sessionNarrative.push("The canvas is blank — they haven't started painting yet.");
    } else if (history.totalStrokes < 10) {
      sessionNarrative.push(`They've just started — only ${history.totalStrokes} strokes so far. Still exploring.`);
    } else if (history.totalStrokes < 50) {
      sessionNarrative.push(`They've made about ${history.totalStrokes} strokes — getting into the flow.`);
    } else {
      sessionNarrative.push(`They've made ${history.totalStrokes} strokes — deep in creative mode!`);
    }

    if (history.stampsPlaced && history.stampsPlaced.length > 0) {
      const unique = [...new Set(history.stampsPlaced)];
      if (unique.length === 1) {
        sessionNarrative.push(`They stamped ${unique[0]} onto the canvas (${history.stampsPlaced.length} time${history.stampsPlaced.length > 1 ? 's' : ''}).`);
      } else {
        sessionNarrative.push(`They've stamped these Pokemon: ${unique.join(', ')}. That's ${history.stampsPlaced.length} stamps total!`);
      }
    }

    if (history.toolsUsed && history.toolsUsed.length > 0) {
      sessionNarrative.push(`Tools they've tried: ${history.toolsUsed.join(', ')}.`);
    }

    if (history.uniqueColorsUsed) {
      sessionNarrative.push(`They've used ${history.uniqueColorsUsed} different colors so far.`);
    }

    if (dominantColors && dominantColors.length > 0) {
      const colorNames: Record<string, string> = {
        '#e00000': 'red', '#e0e000': 'yellow', '#00e000': 'green', '#0000e0': 'blue',
        '#e000e0': 'purple/pink', '#e0e0e0': 'light gray', '#000000': 'black',
        '#e06000': 'orange', '#00e0e0': 'cyan/teal', '#600000': 'dark red',
        '#006000': 'dark green', '#000060': 'dark blue', '#600060': 'dark purple',
        '#e0a000': 'gold/amber', '#a0e000': 'yellow-green', '#00a0e0': 'sky blue',
        '#a000e0': 'violet', '#e000a0': 'magenta', '#e0c0a0': 'beige/tan',
        '#a06000': 'brown', '#808080': 'gray', '#c0c0c0': 'silver',
      };
      const described = dominantColors.map((c: string) => colorNames[c.toLowerCase()] || c).join(', ');
      sessionNarrative.push(`The canvas is dominated by: ${described}.`);
    }

    if (history.coloringPokemon) {
      sessionNarrative.push(`They're in COLORING MODE — coloring a ${history.coloringPokemon} outline.`);
    }

    if (history.activeTypeEffect) {
      sessionNarrative.push(`They have the ${history.activeTypeEffect.toUpperCase()} type effect brush active — particles and themed colors!`);
    }

    if (history.challengesCompleted > 0) {
      sessionNarrative.push(`They've completed ${history.challengesCompleted} art challenge${history.challengesCompleted > 1 ? 's' : ''} this session!`);
    }

    if (history.paintingsSaved > 0) {
      sessionNarrative.push(`They've saved ${history.paintingsSaved} painting${history.paintingsSaved > 1 ? 's' : ''} to their gallery.`);
    }

    const isGreeting = event === 'greeting';

    const prompt = isGreeting
      ? `${playerName} just chose you as their art buddy! This is your FIRST moment together.

Introduce yourself with your signature energy. Tell them something about yourself that connects to art — maybe your flame/sparks/vines/psychic powers help you paint, maybe you once created something with your abilities. Use their name. Make them feel like they chose the BEST buddy ever.`

      : `${playerName} just clicked on you wanting to hear your thoughts!

HERE IS EXACTLY WHAT THEY'VE BEEN DOING:
${sessionNarrative.join('\n')}

Their current tool: ${currentTool || 'brush'}

NOW REACT. Pick the most interesting thing from the session data and comment on it specifically.
- If they stamped Pokemon, name the Pokemon and react to them (are they your friend? rival? do you think they're cool?)
- If the canvas is dominated by colors that match or contrast your type, react viscerally
- If they've been using a specific tool a lot, comment on their technique
- If they're coloring a specific Pokemon, say something about that Pokemon
- If they have a type effect active, react to it (same type as you = excited, opposite = playfully jealous)
- If the canvas is still mostly blank, encourage them to start
- If they've done a LOT, be genuinely impressed by the volume of work

DO NOT give generic praise. Reference SPECIFIC things from the data above.`;

    const { object } = await generateObject({
      model,
      schema: z.object({
        message: z.string().describe('A vivid, specific, in-character observation about what the child has actually been doing. References real session data. 1-2 punchy sentences. No generic filler.'),
        emoji: z.string().describe('One emoji matching this Pokemon type'),
        reaction: z.enum(['bounce', 'wiggle', 'spin', 'hearts', 'stars']).describe('Physical animation reaction'),
      }),
      system: BUDDY_CONTEXT,
      prompt: `You are ${buddyName}, a ${buddyTypes.join('/')} type Pokemon.

${prompt}

Channel ${buddyName}'s energy. Small/cute Pokemon = squeaky and adorable. Big/powerful = booming and dramatic. Mysterious = enigmatic but warm.`,
      maxTokens: 200,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error('Paint buddy error:', error);
    return NextResponse.json(
      { message: "That looks great! Keep painting!", emoji: "🎨", reaction: "bounce" as const },
      { status: 200 }
    );
  }
}
