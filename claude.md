# Pokemon Games for Kids

A collection of fun, educational Pokemon games built with Next.js for children ages 5-10.

## Project Structure

```
src/
├── app/              # Next.js pages (each game is a page)
├── components/       # Shared components (Header)
├── data/             # Pokemon database and generated data
│   ├── pokemon.db    # SQLite database with 1008 Pokemon
│   └── pokemon.ts    # Generated TypeScript data
└── lib/              # Utility packages (AI, Speech, Sounds, Player)
```

---

## Core Packages

These packages expose **raw, powerful APIs** for building sophisticated game experiences. Games should leverage these creatively with custom prompts, dynamic content generation, and immersive audio feedback.

> **IMPORTANT**: Implement these packages **sophisticatedly**. Don't just use simple helper methods — write complex prompts, create dynamic narratives, generate contextual content, and build immersive experiences that make each game unique and engaging.

---

### 1. AI Generation (`src/lib/ai.ts`)

**Full access to Vercel AI SDK with OpenAI for structured data generation.**

Games should write their own complex prompts to generate dynamic, contextual content — not just call helper methods.

**Requirements:** `OPENAI_API_KEY` in environment variables.

#### Raw APIs (Use These for Creative Freedom)

```typescript
// Import directly from the ai lib - everything you need is re-exported
import { generateObject, generateText, openai, z, defaultModel } from '@/lib/ai';

// Or use the default model directly
const model = defaultModel;  // Pre-configured gpt-4o-mini

// Generate structured data with YOUR OWN schema and prompt
const { object } = await generateObject({
  model,
  schema: z.object({
    story: z.string().describe('A short adventure story'),
    choices: z.array(z.string()).describe('3 choices for the player'),
    mood: z.enum(['exciting', 'mysterious', 'funny']),
  }),
  prompt: `Create an interactive Pokemon adventure for ${playerName}.
           They just encountered a wild ${pokemon.name} (${pokemon.types.join('/')}).
           The Pokemon is ${pokemon.genus}. Its flavor text: "${pokemon.flavor_text}"

           Write a short, exciting story (2-3 sentences) about this encounter
           and give 3 creative choices for what the player could do next.
           Make it fun and age-appropriate for kids 5-10.`,
});

// Generate free-form text for narratives, descriptions, hints
const { text } = await generateText({
  model,
  prompt: `You are a Pokemon Professor talking to a young trainer named ${playerName}.
           They just caught their ${caughtCount}th Pokemon: ${pokemon.name}!

           Give them an enthusiastic, personalized congratulation that:
           - Mentions something unique about ${pokemon.name}
           - Encourages them to keep exploring
           - Uses Pokemon-themed language
           - Is 2-3 sentences max`,
});
```

#### Sophisticated Implementation Ideas

- **Dynamic Quiz Generation**: Generate unique questions based on the specific Pokemon, its lore, stats, and evolution chain
- **Personalized Narratives**: Create story segments that reference the player's progress, caught Pokemon, and play style
- **Contextual Hints**: Generate hints that adapt to how many attempts the player has made
- **Battle Commentary**: Real-time AI-generated commentary during catch attempts
- **Pokemon Personality**: Generate unique personalities and dialogue for each Pokemon encounter
- **Achievement Descriptions**: Create custom achievement text based on what the player accomplished

#### Helper Methods (For Quick Implementations)

```typescript
import {
  generatePokemonFact,        // Generate fun facts about a Pokemon
  generateQuizQuestions,      // Generate quiz questions
  generateEncouragement,      // Generate encouragement messages
  generateBattleCommentary,   // Generate battle commentary
  generatePokemonDescription, // Generate Pokemon descriptions
  generateHint,               // Generate game hints
  generatePersonalizedMessage,// Generate personalized messages (async)
  getQuickPersonalizedMessage // Quick personalized message (instant, no API)
} from '@/lib/ai';
```

---

### 2. Text-to-Speech (`src/lib/speech.ts`)

**Full access to the Web Speech API for dynamic voice experiences.**

Games should create immersive audio experiences — narrate stories, announce events dynamically, give real-time feedback with varied tones and pacing.

#### Raw API (Use for Creative Freedom)

```typescript
import {
  // Core functions
  speak,
  stopSpeaking,
  isSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  // Voice management
  getVoices,
  loadVoices,
  getKidFriendlyVoice,
  // Low-level access
  getSpeechSynthesis,  // Direct access to browser API
  createUtterance,     // Create raw SpeechSynthesisUtterance
  isSpeechSupported,   // Check browser support
  // Types
  SpeechOptions,
} from '@/lib/speech';

// Full control over speech synthesis
speak(text, {
  rate: 0.8,      // Slow, dramatic narration (0.1 to 10)
  pitch: 1.5,     // High-pitched, excited voice (0 to 2)
  volume: 1.0,    // Full volume (0 to 1)
  lang: 'en-US',  // Language
  voice: getKidFriendlyVoice(),  // Or pick a specific voice
  onEnd: () => {},   // Callback when speech ends
  onStart: () => {}, // Callback when speech starts
});

// For maximum control, use the raw browser APIs
const synthesis = getSpeechSynthesis();
const utterance = createUtterance("Custom speech!");
utterance.rate = 0.5;
synthesis?.speak(utterance);
```

#### Sophisticated Implementation Ideas

- **Dynamic Narration**: Speak AI-generated stories with dramatic pacing
- **Pokemon Voices**: Vary pitch/rate based on Pokemon size (deep for large, high for small)
- **Excitement Levels**: Increase speech rate and pitch as player streaks grow
- **Contextual Tone**: Slower, gentler speech for wrong answers; faster, excited for wins
- **Multi-part Dialogue**: Chain speeches with callbacks for interactive storytelling
- **Countdown with Tension**: Slow down speech as countdown approaches zero

```typescript
// Example: Dynamic Pokemon announcement with personality
const announcePokemonDynamically = (pokemon: Pokemon) => {
  const isLarge = pokemon.height > 20; // > 2 meters
  const isLegendary = pokemon.is_legendary || pokemon.is_mythical;

  speak(`A wild ${pokemon.name} appeared!`, {
    rate: isLegendary ? 0.8 : 1.0,  // Dramatic for legendaries
    pitch: isLarge ? 0.7 : 1.2,      // Deep for large, high for small
    volume: isLegendary ? 1.0 : 0.8, // Louder for special Pokemon
  });
};
```

#### Helper Methods (For Quick Implementations)

```typescript
import {
  announcePokemon,    // "It's [Pokemon]!"
  sayCorrect,         // "Correct! Great job!"
  sayWrong,           // "Oops! Try again!"
  celebrateWin,       // "You did it! Amazing!"
  encourageAfterLoss, // "Good try! You'll get it!"
  announceHighScore,  // "New high score!"
  countdown,          // "3... 2... 1... Go!"
  readHint,           // "Here's a hint: ..."
  announceScore,      // "Your score is X!"
} from '@/lib/speech';
```

---

### 3. Sound Effects (`src/lib/sounds.ts`)

**Full audio control with Web Audio API for rich soundscapes.**

Games should layer sounds, vary playback, and create audio feedback that responds to game state.

#### Raw API (Use for Creative Freedom)

```typescript
import {
  // Core functions
  playSound,
  playCustomSound,  // Play any audio URL
  stopSound,
  // Audio creation
  createAudio,       // Create Audio element for a sound effect
  createCustomAudio, // Create Audio element for any URL
  // Global control
  setGlobalVolume,
  getGlobalVolume,
  mute,
  unmute,
  toggleMute,
  isSoundMuted,
  // Preloading
  preloadSound,
  preloadAllSounds,
  preloadCommonSounds,
  // Utilities
  getAllSoundEffects,  // Get all available sound names
  getSoundPath,        // Get file path for a sound
  // Types
  SoundEffect,
  PlaySoundOptions,
} from '@/lib/sounds';

// Full control over sound playback
const audio = playSound('success', {
  volume: 0.5,   // Quieter (0 to 1)
  rate: 1.5,     // Faster playback (0.5 to 2)
  loop: true,    // Loop continuously
});

// Stop a specific sound
stopSound(audio);

// Play custom audio (e.g., Pokemon cries from the database)
const cry = playCustomSound(pokemon.cries, { volume: 0.8 });

// Create Audio for advanced control (e.g., crossfading)
const bg1 = createAudio('levelup');
const bg2 = createAudio('powerup');
bg1.volume = 1.0;
bg2.volume = 0.0;
// ... implement crossfade
```

#### Sophisticated Implementation Ideas

- **Layered Audio**: Play multiple sounds simultaneously (background + effects)
- **Dynamic Pitch**: Vary playback rate based on game tempo or excitement
- **Progressive Feedback**: Play increasingly intense sounds for streaks
- **Contextual Volume**: Quieter sounds during speech, louder during action
- **Sound Chains**: Sequence sounds for complex audio feedback
- **Adaptive Soundscape**: Change background sounds based on game state

```typescript
// Example: Progressive streak sounds
const playStreakSound = (streakCount: number) => {
  playSound('combo', {
    rate: 1 + (streakCount * 0.1),  // Gets faster with streak
    volume: Math.min(1, 0.5 + (streakCount * 0.1)), // Gets louder
  });
};

// Example: Legendary Pokemon encounter
const playLegendaryEncounter = () => {
  playSound('whoosh', { volume: 0.3 });
  setTimeout(() => playSound('powerup', { rate: 0.8 }), 200);
  setTimeout(() => playSound('success', { volume: 1.0 }), 500);
};
```

#### Available Sound Effects

| Category | Sounds |
|----------|--------|
| UI | `click`, `select`, `hover` |
| Feedback | `success`, `error`, `ding` |
| Fun | `pop`, `whoosh`, `bounce` |
| Game | `coin`, `levelup`, `powerup` |
| Pokemon | `catch`, `release` |
| Results | `win`, `lose` |
| Special | `countdown`, `card_flip`, `match`, `combo`, `streak` |

#### Helper Methods (For Quick Implementations)

```typescript
import {
  click, success, error, pop, whoosh, ding,
  coin, levelUp, powerUp, bounce,
  catchSound, release, win, lose,
  cardFlip, match, combo, streak
} from '@/lib/sounds';

// React hook for component-level control
import { useSounds } from '@/lib/sounds';
const { play, stop, setVolume, mute, unmute, isMuted } = useSounds();
```

---

### 4. Player Context (`src/lib/player.tsx`)

**Persistent player identity and preferences.**

```typescript
import { usePlayer, getPlayerName, setPlayerName } from '@/lib/player';

// In React components
const { name, setName, soundEnabled, speechEnabled, volume } = usePlayer();

// Outside React
const playerName = getPlayerName();
```

---

## Pokemon Data (`src/data/pokemon.ts`)

Comprehensive data for all 1008 Pokemon with 36 fields per Pokemon.

```typescript
import {
  pokemon,              // All 1008 Pokemon
  pokemonById,          // Map: id -> Pokemon
  pokemonByName,        // Map: name -> Pokemon
  legendaryPokemon,     // Legendary Pokemon only
  mythicalPokemon,      // Mythical Pokemon only
  evolutionChains,      // Map: chain_id -> Pokemon[]
  allTypes,             // All Pokemon types
  allGenerations,       // All generation numbers
} from '@/data/pokemon';
```

**Pokemon Interface includes**: id, name, types, height, weight, all stats (hp, attack, defense, special_attack, special_defense, speed), images (image, sprite_front, sprite_back, sprite_shiny), genus, flavor_text, generation, is_legendary, is_mythical, evolution_chain_id, evolves_from, abilities, color, shape, habitat, and more.

---

## Implementation Guidelines

### DO: Sophisticated Implementations

1. **Write custom prompts** that incorporate game context, player history, and Pokemon data
2. **Generate dynamic content** — stories, hints, commentary that adapt to the situation
3. **Layer audio feedback** — combine sounds, vary pitch/rate based on game state
4. **Use speech dramatically** — vary pacing and tone for emotional impact
5. **Personalize everything** — use player name, reference their progress and achievements
6. **Create unique experiences** — each encounter should feel fresh and engaging

### DON'T: Simple Implementations

- Just calling `sayCorrect()` on every correct answer
- Using the same sound effect for all actions
- Static, non-contextual messages
- Ignoring player name and progress
- One-size-fits-all feedback

---

## Scripts

```bash
node scripts/generate-pokemon-data.mjs  # Generate TypeScript from SQLite
node scripts/download-sounds.mjs         # Download sound effects
node scripts/fetch-pokemon.mjs           # Fetch Pokemon data from PokeAPI
```

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
```
