# Pokemon Games for Kids

A fun collection of Pokemon-themed games built with Next.js, designed for young children (ages 5-6). All games are mouse-only and feature colorful, kid-friendly designs.

## Games

### 1. Pokedex
Browse all 150 original Pokemon! Features search functionality and type filtering to help kids explore and learn about different Pokemon.

### 2. Catch Pokemon
Pokemon float around the screen - click to catch them! Build your collection of all 150 Pokemon. Legendary Pokemon (with golden glow) move faster and are harder to catch.

### 3. Bubble Pop
Pop colorful Pokemon bubbles before they float away! Features:
- Increasing difficulty levels
- Score tracking with high score persistence
- Don't let 5 bubbles escape!

### 4. Memory Match
Classic memory card matching game with Pokemon! Match pairs of Pokemon cards with three difficulty levels:
- Easy: 4 pairs
- Medium: 6 pairs
- Hard: 8 pairs

### 5. Who's That Pokemon?
Guess the Pokemon from its silhouette! Features two independent difficulty settings:

**Letter Hints:**
- Easy: Full Pokemon names shown
- Medium: 50% of letters revealed
- Hard: 30% of letters revealed

**Image Scramble:**
- Easy: Normal silhouette
- Medium: Image split into 4 scrambled tiles
- Hard: Image split into 16 scrambled tiles

### 6. Type Quiz
Learn Pokemon types with colorful quizzes! See a Pokemon and guess its type from four options. Great for learning about Fire, Water, Grass, Electric, and more!

### 7. Evolution Chain
Put Pokemon in the correct evolution order! Click Pokemon from baby to final form. Features 12 evolution chains including:
- Bulbasaur → Ivysaur → Venusaur
- Charmander → Charmeleon → Charizard
- Squirtle → Wartortle → Blastoise
- And 9 more!

### 8. Feed Pokemon
Drag colorful berries to hungry Pokemon to make them happy! Features:
- 5 different berry types (Oran, Cheri, Sitrus, Pecha, Rawst)
- Happiness meter
- Celebration animations when Pokemon are full

### 9. Big or Small?
Guess if a Pokemon is big or small based on its actual height! Educational game that teaches kids about Pokemon sizes with fun comparisons like "Small like a cat!" or "As tall as a grown-up!"

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Data:** Pokemon data fetched from PokeAPI with local sprite images

## Getting Started

### Install dependencies
```bash
npm install
```

### Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pokemon Data

All 150 original Pokemon sprites are stored locally in `/public/pokemon/`. Pokemon data including names, types, and IDs are stored in `/src/data/pokemon.ts`.

To re-fetch Pokemon data:
```bash
node scripts/fetch-pokemon.js
```

## Features

- Mouse-only controls (no keyboard required)
- Large, colorful buttons for small hands
- Fun animations and visual feedback
- Score and streak tracking
- Kid-friendly designs with Pokemon themes
- Educational elements (types, sizes, evolution chains)

## License

This project is for personal/educational use. Pokemon is a trademark of Nintendo/Game Freak/The Pokemon Company.
