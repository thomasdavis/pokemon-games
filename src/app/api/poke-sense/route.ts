/**
 * PokéSense AI Dialogue API
 * Server-side AI generation for all game dialogues
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o-mini');

// Base context for narrator prompts
const NARRATOR_CONTEXT = `You are a magical, enthusiastic Pokemon narrator speaking to a 6-year-old child.
Your voice will be read aloud using text-to-speech.

CRITICAL RULES:
- Keep responses SHORT (1-2 sentences max unless specified otherwise)
- Use simple words a 6-year-old understands
- Be EXCITED and FUN - use exclamations!
- Never be scary or negative
- Make learning feel like an adventure
- Sound like a warm, encouraging friend
- Use comparisons kids understand (height of a cat, heavy as a backpack, fast as a car)
- NO emojis (this is for speech)
- NO questions back to the child
- Just enthusiastic statements!

NAME USAGE - CRITICAL:
- NEVER use the child's name unless specifically told to
- Names should only appear in catch celebrations, achievements, and welcome messages
- All other messages should NOT include any name

VOCABULARY VARIETY - ESSENTIAL:
Never use "amazing" - rotate through these instead:
- Positive: fantastic, brilliant, superb, wonderful, incredible, spectacular, magnificent, outstanding, phenomenal, marvelous, stellar, exceptional, terrific, splendid, remarkable, extraordinary, sensational
- Encouraging: you've got this, that was perfect, like a true trainer, unstoppable, such skill, what talent
- Excitement: wow, hooray, oh boy, how exciting, what a thrill, so cool, this is epic, unbelievable

Be creative and never repeat the same phrases!`;

// Pokedex voice context - STRICT LENGTH LIMIT
const POKEDEX_CONTEXT = `You are the Pokédex. You MUST respond in EXACTLY 2 sentences. No more, no less.

ABSOLUTE RULES:
- EXACTLY 2 sentences total. This is mandatory.
- First sentence: Name, type, and one size comparison
- Second sentence: One cool fact or ability
- NO emojis
- Robotic but friendly tone`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let result: string;

    switch (type) {
      case 'pokedex':
        result = await generatePokedexEntry(data);
        break;
      case 'encounter':
        result = await generateEncounter(data);
        break;
      case 'introduction':
        result = await generateIntroduction(data);
        break;
      case 'skillBriefing':
        result = await generateSkillBriefing(data);
        break;
      case 'encouragement':
        result = await generateEncouragement(data);
        break;
      case 'success':
        result = await generateSuccess(data);
        break;
      case 'catch':
        result = await generateCatch(data);
        break;
      case 'fact':
        result = await generateFact(data);
        break;
      case 'achievement':
        result = await generateAchievement(data);
        break;
      case 'welcomeBack':
        result = await generateWelcomeBack(data);
        break;
      case 'firstWelcome':
        result = await generateFirstWelcome(data);
        break;
      case 'hint':
        result = await generateHint(data);
        break;
      case 'readyNext':
        result = await generateReadyNext();
        break;
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    return NextResponse.json({ text: result });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}

async function generatePokedexEntry(data: {
  name: string;
  id: number;
  types: string[];
  height: number;
  weight: number;
  genus: string | null;
  generation: number | null;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  evolves_from: string | null;
  is_legendary: boolean;
  is_mythical: boolean;
  abilities: string[];
}): Promise<string> {
  const heightM = data.height / 10;
  const weightKg = data.weight / 10;

  const { text } = await generateText({
    model,
    system: POKEDEX_CONTEXT,
    prompt: `${data.name}, ${data.types.join('/')} type, ${heightM}m tall, ${weightKg}kg. ${data.genus || ''}.${data.is_legendary ? ' Legendary.' : ''}${data.is_mythical ? ' Mythical.' : ''} Write EXACTLY 2 sentences.`,
    maxTokens: 80,
  });
  return text;
}

async function generateEncounter(data: {
  pokemonName: string;
  types: string[];
  id: number;
  is_legendary: boolean;
  is_mythical: boolean;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `A wild ${data.pokemonName} just appeared! It's a ${data.types.join('/')} type Pokemon, #${data.id}.

Create an exciting 2-sentence announcement. First sentence: describe the atmosphere/environment based on its ${data.types[0]} type (fire=warmth and crackling, water=splashing sounds, grass=rustling leaves, ghost=mysterious shadows, electric=static in the air, etc). Second sentence: excitedly reveal the Pokemon's name and make it sound special!

DO NOT use any player name. Focus purely on the dramatic appearance!

${data.is_legendary ? 'THIS IS A LEGENDARY POKEMON - make it sound EPIC and ancient!' : ''}
${data.is_mythical ? 'THIS IS A MYTHICAL POKEMON - make it sound MAGICAL and incredibly rare!' : ''}`,
  });
  return text;
}

async function generateIntroduction(data: {
  pokemonName: string;
  types: string[];
  height: number;
  weight: number;
  speed: number;
  attack: number;
  defense: number;
  evolves_from: string | null;
  is_legendary: boolean;
  is_mythical: boolean;
  generation: number | null;
}): Promise<string> {
  const heightM = data.height / 10;
  const weightKg = data.weight / 10;

  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Teach about ${data.pokemonName} in 3-4 short, fun sentences:

Pokemon facts:
- Type: ${data.types.join(' and ')}
- Height: ${heightM}m
- Weight: ${weightKg}kg
- Speed: ${data.speed}, Attack: ${data.attack}, Defense: ${data.defense}
${data.evolves_from ? `- Evolved from: ${data.evolves_from}` : ''}
${data.is_legendary ? '- LEGENDARY Pokemon!' : ''}
${data.is_mythical ? '- MYTHICAL Pokemon!' : ''}
- Generation: ${data.generation || 'Unknown'}

Make fun, creative comparisons a 6-year-old would love (height like a golden retriever, weighs as much as 10 pizzas, fast as a race car, strong as a superhero). End with excitement about catching it!

DO NOT use any player name - focus on teaching about this incredible Pokemon!`,
  });
  return text;
}

async function generateSkillBriefing(data: {
  skillType: string;
  pokemonName: string;
}): Promise<string> {
  const skillDescriptions: Record<string, string> = {
    aim: 'click when the shrinking circle turns green',
    track: 'keep the mouse cursor on the Pokemon until the bar fills up',
    dodge: 'click on the Pokemon as it bounces around the screen',
    typematch: 'click on the correct type badge that matches the Pokemon',
    sequence: 'remember and repeat a pattern of colors',
    speedcatch: 'click the Pokemon super fast when it appears',
  };

  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `To catch ${data.pokemonName}, you need to ${skillDescriptions[data.skillType] || 'complete the challenge'}.

Give a quick, encouraging 2-sentence pep talk! First explain what to do in simple terms, then pump up with confidence! Make it sound like a fun game, not a test.

Use varied vocabulary like: "you've totally got this", "piece of cake", "show those skills", "this is going to be a blast", "let's do this", etc.

DO NOT use any player name - keep it short, snappy, and exciting!`,
  });
  return text;
}

async function generateEncouragement(data: {
  pokemonName: string;
  skillType: string;
  attempts: number;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Missed catching ${data.pokemonName} on attempt #${data.attempts} (skill: ${data.skillType}).

Give ONE short, genuinely encouraging sentence!
${data.attempts === 1 ? 'First try - be super positive about their effort!' : ''}
${data.attempts === 2 ? 'Second try - remind them practice makes perfect!' : ''}
${data.attempts >= 3 ? 'They\'ve tried ' + data.attempts + ' times - praise their incredible persistence!' : ''}

IMPORTANT: Never say "oops" or make them feel bad. Focus on how close they were or how brave they are for trying!

Use VARIED vocabulary - rotate through these:
- "So close! Nearly had it!"
- "Almost there! Getting better each time!"
- "Wow, really getting the hang of this!"
- "Keep going! Such determination!"
- "Great try! The next one will be even better!"
- "That was a solid attempt!"
- "Practice makes perfect - and you're proving it!"

DO NOT use any player name or "amazing" - keep it quick and encouraging!`,
  });
  return text;
}

async function generateSuccess(data: {
  playerName: string;
  skillType: string;
  streak: number;
  pokemonName: string;
  attempts: number;
  is_legendary: boolean;
  is_mythical: boolean;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Successfully completed the ${data.skillType} challenge to catch ${data.pokemonName}!

Stats:
- Attempts it took: ${data.attempts}
- Current catch streak: ${data.streak}
${data.streak >= 5 ? '- WOW on FIRE with ' + data.streak + ' in a row!' : ''}
${data.attempts === 1 ? '- FIRST TRY! That\'s incredible!' : ''}
${data.is_legendary ? '- Caught a LEGENDARY!' : ''}
${data.is_mythical ? '- Caught a MYTHICAL!' : ''}

Give an excited 1-2 sentence celebration! Match the energy to how impressive this was!

Use VARIED celebration words - rotate through:
- "Incredible!", "Spectacular!", "Magnificent!", "Phenomenal!", "Outstanding!"
- "What a superstar!", "On fire!", "Unstoppable!", "A true Pokemon master!"
- "That was absolutely brilliant!", "Perfect timing!", "Flawless!", "Like a pro!"

ONLY use the player name "${data.playerName}" if they caught a legendary/mythical or got a streak of 5+. Otherwise, do NOT use any name.

NEVER just say "amazing" - be more creative and specific!`,
  });
  return text;
}

async function generateCatch(data: {
  pokemonName: string;
  playerName: string;
  totalCaught: number;
  is_legendary: boolean;
  is_mythical: boolean;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Just caught ${data.pokemonName}! Total Pokemon: ${data.totalCaught}.

Create a 2-sentence catch celebration!
${data.is_legendary ? 'This is a LEGENDARY Pokemon - make it EPIC!' : ''}
${data.is_mythical ? 'This is a MYTHICAL Pokemon - make it feel magical and special!' : ''}
${data.totalCaught === 1 ? 'This is the VERY FIRST Pokemon ever!' : ''}
${data.totalCaught === 10 ? 'Just reached 10 Pokemon - a milestone!' : ''}
${data.totalCaught === 50 ? 'WOW 50 Pokemon - becoming a master!' : ''}
${data.totalCaught === 100 ? 'INCREDIBLE - 100 Pokemon!' : ''}

Welcome ${data.pokemonName} to the team!

ONLY use the player name "${data.playerName}" for these special moments:
- First Pokemon ever
- Legendary or Mythical catch
- Milestone (10, 50, 100)

Otherwise, do NOT use any name. Use creative celebration language!`,
  });
  return text;
}

async function generateFact(data: {
  pokemonName: string;
  types: string[];
  height: number;
  weight: number;
  generation: number | null;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  evolves_from: string | null;
  abilities: string[];
  is_legendary: boolean;
  is_mythical: boolean;
  factNumber: number;
}): Promise<string> {
  const heightM = data.height / 10;
  const weightKg = data.weight / 10;

  const factTopics = [
    'what makes this type special and what powers it has',
    'fun size comparison to everyday objects and animals',
    'what this Pokemon might love to do for fun or play',
    'what its stats mean in a kid-friendly way (speed=fast runner, attack=strong)',
    'its evolution story and how it grows',
    'where this Pokemon might live and why',
    'what makes this Pokemon unique and special compared to others',
    'an imaginary adventure you could have with this Pokemon',
  ];

  const topic = factTopics[data.factNumber % factTopics.length];

  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Share one fun, creative fact about ${data.pokemonName} (fact #${data.factNumber + 1}).

Focus on: ${topic}

Pokemon data:
- Types: ${data.types.join(', ')}
- Height: ${heightM}m
- Weight: ${weightKg}kg
- Generation: ${data.generation || 'Unknown'}
- HP: ${data.hp}, Attack: ${data.attack}, Defense: ${data.defense}, Speed: ${data.speed}
${data.evolves_from ? `- Evolved from: ${data.evolves_from}` : ''}
${data.abilities.length ? `- Abilities: ${data.abilities.join(', ')}` : ''}
${data.is_legendary ? '- Legendary Pokemon' : ''}
${data.is_mythical ? '- Mythical Pokemon' : ''}

Make it creative, fun, and educational! Use imaginative comparisons and storytelling! ONE sentence only.
DO NOT use any player name - just share the fascinating fact!`,
  });
  return text;
}

async function generateAchievement(data: {
  playerName: string;
  achievementName: string;
  achievementDescription: string;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Achievement unlocked: "${data.achievementName}"
Description: ${data.achievementDescription}

Create an exciting 1-2 sentence celebration of this accomplishment! Make them feel proud and special!

Use the player name "${data.playerName}" - this is a big moment they earned!

Use varied celebration words like: "Incredible!", "What an accomplishment!", "You earned it!", "A true champion!", "Legendary achievement!"`,
  });
  return text;
}

async function generateWelcomeBack(data: {
  playerName: string;
  totalCaught: number;
  lastPokemonName: string | null;
  daysSince: number;
}): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Welcome back "${data.playerName}" to Pokemon catching!

Stats:
- Total Pokemon caught: ${data.totalCaught}
${data.lastPokemonName ? `- Last Pokemon caught: ${data.lastPokemonName}` : ''}
- Days since last play: ${data.daysSince}

Create a warm 2-sentence welcome back!
${data.daysSince === 0 ? 'They just played recently - welcome them back for more fun!' : ''}
${data.daysSince >= 7 ? 'They haven\'t played in a while - tell them you missed them!' : ''}
${data.totalCaught === 0 ? 'This might be their first time - be extra welcoming!' : ''}

Use their name once warmly. Get them excited to catch more Pokemon today!`,
  });
  return text;
}

async function generateFirstWelcome(data: { playerName: string }): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Welcome a first-time player named "${data.playerName}" to PokéSense!

Create an exciting 2-sentence welcome message that:
- Introduces the adventure of catching Pokemon
- Makes them feel excited to start
- Uses their name once warmly (this is a special moment!)
- Sounds warm and inviting

Use varied vocabulary - words like "thrilling", "incredible", "fantastic adventure", "magical journey" etc.`,
  });
  return text;
}

async function generateHint(data: {
  skillType: string;
  attempts: number;
}): Promise<string> {
  const hints: Record<string, string> = {
    aim: 'clicking when the circle turns green and is the right size',
    track: 'keeping the mouse steady on the Pokemon without moving too fast',
    dodge: 'watching where the Pokemon is bouncing and clicking ahead of it',
    typematch: 'remembering what type this Pokemon is from the introduction',
    sequence: 'watching the pattern carefully before repeating',
    speedcatch: 'keeping your hand ready on the mouse',
  };

  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Give a quick, helpful hint for the ${data.skillType} challenge (attempt #${data.attempts}).

The skill involves: ${hints[data.skillType] || 'completing the challenge'}

ONE short sentence with a specific, actionable tip! Be encouraging, not critical.
DO NOT use any player name - just give the helpful tip!`,
  });
  return text;
}

async function generateReadyNext(): Promise<string> {
  const { text } = await generateText({
    model,
    system: NARRATOR_CONTEXT,
    prompt: `Just finished learning about a caught Pokemon.

Create ONE short, excited sentence asking if ready to find another Pokemon.
DO NOT use any player name - keep it snappy!

Use varied vocabulary like:
- "Ready for the next adventure?"
- "Let's find another one!"
- "Time to discover more Pokemon!"
- "On to the next catch!"
- "The adventure continues!"
- "More Pokemon await!"`,
  });
  return text;
}
