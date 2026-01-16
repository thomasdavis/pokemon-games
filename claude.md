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

## Available Packages

When building or modifying games, use these packages to enhance the experience:

### 1. AI Generation (`src/lib/ai.ts`)

Generate dynamic, kid-friendly content using OpenAI.

**Requirements:** `OPENAI_API_KEY` in environment variables.

```typescript
import {
  generatePokemonFact,
  generateQuizQuestions,
  generateEncouragement,
  generatePersonalizedMessage,
  getQuickPersonalizedMessage
} from '@/lib/ai';

// Generate a fun fact about a Pokemon
const fact = await generatePokemonFact('Pikachu', ['electric']);
// { fact: "Pikachu can store electricity...", emoji: "⚡" }

// Generate quiz questions
const questions = await generateQuizQuestions('Charizard', ['fire', 'flying'], 3);

// Generate encouragement based on game context
const message = await generateEncouragement('winning');
// { message: "You're a Pokemon Master!", emoji: "🏆" }

// Personalized messages with player name (AI-generated)
const personal = await generatePersonalizedMessage('Alex', 'caught_pokemon', {
  pokemonName: 'Pikachu'
});
// { message: "Amazing catch, Alex! Pikachu is lucky to have you!", emoji: "⚡" }

// Quick personalized message (instant, no API call)
const quick = getQuickPersonalizedMessage('Alex', 'won_game', { score: 100 });
// { message: "Alex wins! Amazing!", emoji: "🏆" }
```

**Game Events for Personalized Messages:**
- `caught_pokemon`, `won_game`, `lost_game`, `new_high_score`
- `streak`, `completed_quiz`, `found_match`, `evolution_complete`
- `fed_pokemon`, `correct_answer`, `wrong_answer`, `game_start`, `level_up`

### 2. Text-to-Speech (`src/lib/speech.ts`)

Add voice feedback using the browser's Web Speech API.

```typescript
import {
  speak,
  stopSpeaking,
  announcePokemon,
  sayCorrect,
  sayWrong,
  celebrateWin,
  countdown,
  useSpeech
} from '@/lib/speech';

// Basic speech
speak("It's super effective!");

// Speech with options
speak("Great job!", { rate: 1.2, pitch: 1.1, volume: 0.8 });

// Convenience functions
announcePokemon('Charizard');  // "It's Charizard!"
sayCorrect();                   // "Correct! Great job!"
sayWrong();                     // "Oops! Try again!"
celebrateWin();                 // "You did it! Amazing!"

// Countdown for timed games
await countdown(3);  // "3... 2... 1... Go!"

// React hook
function GameComponent() {
  const { speak, stop, isSpeaking, isSupported } = useSpeech();

  const handleClick = () => {
    speak("You caught it!", { rate: 1.1 });
  };
}
```

### 3. Sound Effects (`src/lib/sounds.ts`)

Play sound effects for game interactions.

```typescript
import {
  playSound,
  click,
  success,
  error,
  pop,
  coin,
  win,
  lose,
  cardFlip,
  useSounds
} from '@/lib/sounds';

// Play any sound effect
playSound('success');
playSound('coin', { volume: 0.5, rate: 1.2 });

// Convenience functions
click();      // UI click sound
success();    // Success/correct sound
error();      // Error/wrong sound
pop();        // Pop sound
coin();       // Coin/point sound
win();        // Victory sound
lose();       // Game over sound
cardFlip();   // Card flip sound

// React hook
function GameComponent() {
  const { play, setVolume, mute, unmute, isMuted } = useSounds();

  const handleMatch = () => {
    play('match');
  };
}
```

**Available Sound Effects:**
`click`, `select`, `hover`, `success`, `error`, `pop`, `whoosh`, `ding`,
`coin`, `levelup`, `powerup`, `bounce`, `catch`, `release`, `win`, `lose`,
`countdown`, `card_flip`, `match`, `combo`, `streak`

### 4. Player Context (`src/lib/player.tsx`)

Manage player name and preferences stored in localStorage.

```typescript
import {
  usePlayer,
  PlayerProvider,
  NameEditor,
  getPlayerName,
  setPlayerName
} from '@/lib/player';

// Wrap your app with PlayerProvider (already in layout.tsx)
<PlayerProvider>
  <App />
</PlayerProvider>

// Use the NameEditor component for inline name editing
<NameEditor className="text-sm" />

// React hook for player data
function GameComponent() {
  const {
    name,           // Current player name
    setName,        // Update name
    soundEnabled,   // Sound preference
    speechEnabled,  // Speech preference
    volume,         // Volume (0-1)
    isLoaded        // Has loaded from localStorage
  } = usePlayer();

  return <div>Welcome, {name}!</div>;
}

// Outside React (for non-component code)
const name = getPlayerName();       // Get name from localStorage
setPlayerName('New Trainer');       // Set name in localStorage
```

## Pokemon Data (`src/data/pokemon.ts`)

Comprehensive data for all 1008 Pokemon.

```typescript
import {
  pokemon,              // Array of all Pokemon
  pokemonById,          // Map: id -> Pokemon
  pokemonByName,        // Map: name -> Pokemon
  legendaryPokemon,     // Array of legendary Pokemon
  mythicalPokemon,      // Array of mythical Pokemon
  evolutionChains,      // Map: chain_id -> Pokemon[]
  allTypes,             // Array of all types
  allGenerations,       // Array of generation numbers
  getHeightInMeters,    // Convert height to meters
  getWeightInKg         // Convert weight to kg
} from '@/data/pokemon';

// Get a random Pokemon
const random = pokemon[Math.floor(Math.random() * pokemon.length)];

// Get Pokemon by ID
const pikachu = pokemonById.get(25);

// Filter by type
const fireTypes = pokemon.filter(p => p.types.includes('fire'));

// Get evolution chain
const bulbasaurFamily = evolutionChains.get(1); // [Bulbasaur, Ivysaur, Venusaur]
```

**Pokemon Interface:**
```typescript
interface Pokemon {
  id: number;
  name: string;
  types: string[];
  height: number;          // In decimeters
  weight: number;          // In hectograms
  image: string;           // High-res image path
  sprite_front: string;
  sprite_back: string;
  sprite_shiny: string;
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  genus: string;           // e.g., "Mouse Pokémon"
  flavor_text: string;
  generation: number;
  is_legendary: boolean;
  is_mythical: boolean;
  evolution_chain_id: number | null;
  evolves_from: string | null;
  // ... and more
}
```

## Best Practices for Games

1. **Use personalized messages** - Call `getQuickPersonalizedMessage()` for instant feedback with the player's name

2. **Add sound effects** - Use `useSounds()` hook and play appropriate sounds for actions

3. **Add speech for important moments** - Use `speak()` for wins, losses, and key moments

4. **Support all 1008 Pokemon** - Use the full `pokemon` array, not a subset

5. **Show legendary/mythical status** - Use `is_legendary` and `is_mythical` flags for special treatment

6. **Use real Pokemon data** - Heights, weights, types, and stats are all accurate

## Scripts

```bash
# Generate TypeScript from SQLite database
node scripts/generate-pokemon-data.mjs

# Download/update sound effects
node scripts/download-sounds.mjs

# Fetch Pokemon data from PokeAPI
node scripts/fetch-pokemon.mjs
```

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
```
