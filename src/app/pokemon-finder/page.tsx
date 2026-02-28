"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound, success, pop, whoosh, click } from "@/lib/sounds";
import { speak, celebrateWin } from "@/lib/speech";

// First 150 Pokemon only
const originalPokemon = pokemon.slice(0, 150);

// Get Pokemon by type for decoys
const getPokemonByType = (type: string, excludeId: number): Pokemon[] => {
  return originalPokemon.filter(
    (p) => p.types.some((t) => t.toLowerCase() === type.toLowerCase()) && p.id !== excludeId
  );
};

// Get similar colored Pokemon for harder decoys
const getPokemonByColor = (color: string, excludeId: number): Pokemon[] => {
  return originalPokemon.filter(
    (p) => p.color?.toLowerCase() === color?.toLowerCase() && p.id !== excludeId
  );
};

interface DecoyPokemon {
  pokemon: Pokemon;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  hiding: "none" | "partial" | "peeking";
  layer: number;
}

// Clickable red herring objects
interface RedHerring {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  message: string;
  rotation: number;
}

// Foreground obstacles that can partially hide Pokemon
interface ForegroundObstacle {
  id: string;
  content: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: boolean;
}

// ============================================
// DIFFICULTY TYPES
// ============================================
type Difficulty = "easy" | "medium" | "hard";

const difficultyConfig = {
  easy: {
    name: "Easy",
    description: "Emoji landscapes",
    emoji: "🌟",
    color: "from-green-500 to-emerald-600",
    pokemonSize: 65,
    decoyCount: 4,
    decoySize: 50,
    redHerringCount: 8,
    foregroundCount: 6,
    elementDensity: 1.0,
    hintDelay: 12000,
    wiggleDelay: 25000,
  },
  medium: {
    name: "Medium",
    description: "AI scenes + decoys",
    emoji: "🎨",
    color: "from-amber-500 to-orange-600",
    pokemonSize: 50,
    decoyCount: 8,
    decoySize: 42,
    redHerringCount: 12,
    foregroundCount: 10,
    elementDensity: 1.5,
    hintDelay: 20000,
    wiggleDelay: 40000,
  },
  hard: {
    name: "Hard",
    description: "Coming Soon!",
    emoji: "🔥",
    color: "from-red-500 to-rose-600",
    pokemonSize: 40,
    decoyCount: 12,
    decoySize: 38,
    redHerringCount: 16,
    foregroundCount: 14,
    elementDensity: 2.0,
    hintDelay: 30000,
    wiggleDelay: 60000,
  },
};

// ============================================
// ENHANCED SCENE GENERATION SYSTEM
// ============================================

// Type-based environment configurations with MUCH more detail
const typeEnvironments: Record<string, EnvironmentConfig> = {
  fire: {
    name: "Volcanic Valley",
    gradient: "from-orange-900 via-red-800 to-yellow-600",
    baseElements: ["🔥", "🌋", "💥", "✨", "🧡", "❤️", "🟠", "🟡", "💫", "🔶"],
    decorations: ["🪨", "⛰️", "🏔️", "💨", "☀️", "🌅", "🗻", "🌄"],
    critters: ["🦎", "🐉", "🦊"],
    redHerrings: ["🔴", "🍎", "❤️‍🔥", "🎈", "🌶️", "🍅", "🧯", "🏮"],
    foreground: ["🔥", "💨", "🌫️", "☁️"],
    atmosphere: ["ember", "heat-wave", "smoke"],
    weather: ["ash", "heat-shimmer"],
    colorPalette: ["#ff6b35", "#f7931e", "#ffd700", "#8b0000", "#ff4500"],
    timeOfDay: "sunset",
    groundElements: ["🪨", "💎", "🔶", "🟤"],
    skyElements: ["☀️", "🌅", "🌤️", "🔥"],
  },
  water: {
    name: "Ocean Depths",
    gradient: "from-blue-900 via-cyan-700 to-teal-500",
    baseElements: ["💧", "🌊", "💦", "🫧", "💙", "🩵", "🔵", "🩶", "💎", "🌀"],
    decorations: ["🐚", "🪸", "🦪", "⚓", "🚢", "🐠", "🐟", "🦈", "🐙", "🦑", "🪼", "🦐"],
    critters: ["🐠", "🐟", "🦀", "🦐", "🐡", "🦞", "🪼"],
    redHerrings: ["🔵", "🫐", "🧊", "💎", "🪻", "🌀", "🧿", "💠"],
    foreground: ["🫧", "🌊", "💧", "🌫️"],
    atmosphere: ["bubbles", "waves", "current"],
    weather: ["bubbles", "light-rays"],
    colorPalette: ["#0077b6", "#00b4d8", "#90e0ef", "#023e8a", "#48cae4"],
    timeOfDay: "underwater",
    groundElements: ["🐚", "🪸", "🪨", "🦪"],
    skyElements: ["🫧", "💧", "🌊", "✨"],
  },
  grass: {
    name: "Enchanted Forest",
    gradient: "from-green-900 via-emerald-700 to-lime-500",
    baseElements: ["🌿", "🍃", "🌱", "☘️", "💚", "🟢", "🌲", "🌳", "🪴", "🍀"],
    decorations: ["🌸", "🌺", "🌻", "🍄", "🦋", "🐛", "🌼", "🪻", "🪴", "🌷", "🪺", "🥀"],
    critters: ["🐛", "🦋", "🐞", "🐌", "🐝", "🪱", "🦗"],
    redHerrings: ["🥒", "🥬", "🥝", "🍐", "🥑", "🌿", "🎾", "🧩"],
    foreground: ["🌿", "🍃", "🌫️", "🪴"],
    atmosphere: ["leaves", "pollen", "fireflies"],
    weather: ["falling-leaves", "pollen"],
    colorPalette: ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"],
    timeOfDay: "morning",
    groundElements: ["🍄", "🌱", "🪵", "🪨"],
    skyElements: ["🦋", "🐝", "🍃", "☀️"],
  },
  electric: {
    name: "Thunder City",
    gradient: "from-yellow-900 via-amber-600 to-yellow-400",
    baseElements: ["⚡", "💛", "🌟", "✨", "🟡", "💫", "⭐", "🔆", "⚡", "🌩️"],
    decorations: ["🏙️", "🌃", "💡", "🔌", "🎆", "🎇", "📡", "🛸", "🔋", "📺"],
    critters: ["⚡", "💫", "✨"],
    redHerrings: ["🌕", "🌟", "🔔", "🍋", "🌻", "🏆", "🎗️", "💰"],
    foreground: ["⚡", "✨", "💫", "🌟"],
    atmosphere: ["sparks", "static", "glow"],
    weather: ["lightning", "electric-sparks"],
    colorPalette: ["#ffd60a", "#ffc300", "#ffaa00", "#e6b800", "#cccc00"],
    timeOfDay: "night",
    groundElements: ["🔌", "💡", "🔋", "📡"],
    skyElements: ["⚡", "🌩️", "⭐", "🌟"],
  },
  psychic: {
    name: "Cosmic Dreamscape",
    gradient: "from-purple-900 via-pink-700 to-violet-500",
    baseElements: ["💜", "🔮", "✨", "💫", "🌟", "⭐", "🟣", "💗", "🌀", "👁️"],
    decorations: ["🌙", "🌌", "🪐", "👁️", "🧿", "💎", "🎭", "🦄", "🔮", "🌠", "💠"],
    critters: ["🦄", "🌙", "⭐"],
    redHerrings: ["🍇", "🪻", "🔮", "💜", "🎆", "👾", "🪩", "🌸"],
    foreground: ["✨", "💫", "🌟", "🌀"],
    atmosphere: ["stardust", "aurora", "psychic-waves"],
    weather: ["stars", "aurora"],
    colorPalette: ["#7b2cbf", "#9d4edd", "#c77dff", "#e0aaff", "#ff6b9d"],
    timeOfDay: "twilight",
    groundElements: ["🔮", "💎", "🌀", "👁️"],
    skyElements: ["🌙", "⭐", "✨", "🌠"],
  },
  ground: {
    name: "Desert Canyon",
    gradient: "from-amber-900 via-orange-800 to-yellow-700",
    baseElements: ["🟤", "🧱", "🪨", "💛", "🟠", "🟡", "⬛", "🔶", "🏜️", "⛰️"],
    decorations: ["🏜️", "🌵", "🦂", "🐪", "⛰️", "🏔️", "🗿", "🪵", "🦴", "🏺"],
    critters: ["🦂", "🐪", "🦎", "🐍"],
    redHerrings: ["🍪", "🥐", "🏈", "🌰", "🥜", "🪵", "🧸", "🏺"],
    foreground: ["💨", "🌫️", "☁️", "🪨"],
    atmosphere: ["dust", "sand", "tumbleweeds"],
    weather: ["sandstorm", "dust"],
    colorPalette: ["#8b4513", "#d2691e", "#deb887", "#f4a460", "#cd853f"],
    timeOfDay: "noon",
    groundElements: ["🪨", "🌵", "🦴", "🏺"],
    skyElements: ["☀️", "🦅", "💨", "☁️"],
  },
  rock: {
    name: "Crystal Cavern",
    gradient: "from-stone-800 via-gray-600 to-slate-500",
    baseElements: ["🪨", "💎", "🗻", "⬛", "🔘", "🩶", "🟤", "⚪", "💠", "🔷"],
    decorations: ["⛏️", "💍", "🏔️", "⛰️", "🦇", "🕯️", "🔦", "🪙", "💎", "🏆"],
    critters: ["🦇", "🕷️", "🪨"],
    redHerrings: ["🌑", "🖤", "🪨", "💿", "🥌", "🗿", "🪙", "⚙️"],
    foreground: ["🪨", "💎", "🌫️", "⬛"],
    atmosphere: ["crystals", "cave-drip", "shadows"],
    weather: ["stalactite-drip", "glow"],
    colorPalette: ["#6b7280", "#9ca3af", "#4b5563", "#374151", "#1f2937"],
    timeOfDay: "cave",
    groundElements: ["🪨", "💎", "🪙", "💠"],
    skyElements: ["🦇", "✨", "💎", "🕯️"],
  },
  ice: {
    name: "Frozen Wonderland",
    gradient: "from-cyan-900 via-blue-300 to-white",
    baseElements: ["❄️", "🧊", "💠", "🩵", "🔵", "⚪", "🩶", "💎", "🌨️", "⛄"],
    decorations: ["⛄", "🌨️", "🏔️", "🐧", "🦭", "🎿", "🏂", "🛷", "🎄", "❅"],
    critters: ["🐧", "🦭", "❄️", "🐻‍❄️"],
    redHerrings: ["🥛", "🧁", "🤍", "☁️", "🥚", "⚪", "🎱", "🏐"],
    foreground: ["❄️", "🌨️", "🌫️", "💨"],
    atmosphere: ["snowfall", "frost", "blizzard"],
    weather: ["snow", "ice-crystals"],
    colorPalette: ["#a5f3fc", "#67e8f9", "#22d3ee", "#e0f2fe", "#bae6fd"],
    timeOfDay: "aurora",
    groundElements: ["🧊", "❄️", "⛄", "🏔️"],
    skyElements: ["❄️", "🌨️", "✨", "🌙"],
  },
  ghost: {
    name: "Haunted Manor",
    gradient: "from-purple-950 via-gray-800 to-indigo-900",
    baseElements: ["👻", "💀", "🖤", "💜", "⬛", "🟣", "🩶", "👁️", "🌙", "🕯️"],
    decorations: ["🏚️", "🕯️", "🦇", "🕸️", "🌙", "⚰️", "🪦", "🎃", "📿", "🗝️"],
    critters: ["🦇", "🕷️", "🐈‍⬛", "🦉"],
    redHerrings: ["🍇", "🎱", "🌑", "⚫", "🕳️", "🖤", "☂️", "🎩"],
    foreground: ["🌫️", "🕸️", "💨", "👁️"],
    atmosphere: ["fog", "spirits", "shadows"],
    weather: ["mist", "spirits"],
    colorPalette: ["#4c1d95", "#5b21b6", "##6d28d9", "#7c3aed", "#1e1b4b"],
    timeOfDay: "midnight",
    groundElements: ["🪦", "💀", "🕯️", "🗝️"],
    skyElements: ["🌙", "👻", "🦇", "⭐"],
  },
  poison: {
    name: "Toxic Swamp",
    gradient: "from-purple-900 via-green-800 to-lime-600",
    baseElements: ["☠️", "💜", "💚", "🟣", "🟢", "🧪", "💀", "🩷", "🫧", "🌿"],
    decorations: ["🐸", "🦠", "🍄", "🪷", "🐍", "🦎", "🌿", "🪴", "🧫", "⚗️"],
    critters: ["🐸", "🐍", "🦎", "🦟"],
    redHerrings: ["🥒", "🥬", "🍀", "💚", "🫑", "🥝", "🍏", "🧩"],
    foreground: ["🫧", "💨", "🌫️", "🌿"],
    atmosphere: ["toxic-bubbles", "mist", "glow"],
    weather: ["poison-mist", "bubbles"],
    colorPalette: ["#6b21a8", "#7e22ce", "#86efac", "#4ade80", "#a855f7"],
    timeOfDay: "murky",
    groundElements: ["🍄", "🪷", "🧪", "🦠"],
    skyElements: ["🫧", "💀", "✨", "🌙"],
  },
  flying: {
    name: "Sky Kingdom",
    gradient: "from-blue-400 via-sky-300 to-white",
    baseElements: ["☁️", "💨", "🩵", "⚪", "🔵", "🩶", "💙", "🤍", "🌤️", "🌈"],
    decorations: ["🎈", "🪁", "✈️", "🦅", "🕊️", "🌈", "🪂", "🛩️", "🚁", "🎏"],
    critters: ["🦅", "🕊️", "🦜", "🦋", "🐝"],
    redHerrings: ["☁️", "🫧", "🤍", "💭", "🧼", "🥏", "🪁", "🎈"],
    foreground: ["☁️", "💨", "🌫️", "✨"],
    atmosphere: ["clouds", "wind", "feathers"],
    weather: ["clouds", "rainbow"],
    colorPalette: ["#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe", "#f0f9ff"],
    timeOfDay: "day",
    groundElements: ["☁️", "🌈", "✨", "💨"],
    skyElements: ["☁️", "🦅", "🎈", "🪁"],
  },
  bug: {
    name: "Giant Garden",
    gradient: "from-lime-700 via-green-500 to-yellow-400",
    baseElements: ["🐛", "🦋", "🐞", "🪲", "🟢", "💚", "🟡", "🟤", "🌸", "🌺"],
    decorations: ["🌸", "🌺", "🌻", "🍄", "🪻", "🌼", "🍯", "🪺", "🌷", "🪹"],
    critters: ["🐛", "🦋", "🐞", "🐝", "🐌", "🪱", "🦗", "🪳"],
    redHerrings: ["🥬", "🥒", "🍐", "🥝", "🎾", "🫛", "🥗", "🌿"],
    foreground: ["🍃", "🌿", "🌸", "💨"],
    atmosphere: ["butterflies", "pollen", "buzzing"],
    weather: ["pollen", "petals"],
    colorPalette: ["#84cc16", "#a3e635", "#bef264", "#d9f99d", "#fde047"],
    timeOfDay: "spring",
    groundElements: ["🍄", "🌱", "🌼", "🪵"],
    skyElements: ["🦋", "🐝", "🌸", "☀️"],
  },
  normal: {
    name: "Sunny Meadow",
    gradient: "from-green-400 via-yellow-300 to-blue-300",
    baseElements: ["🤍", "🩶", "🟤", "⚪", "🔘", "💛", "🩵", "💚", "☁️", "🌸"],
    decorations: ["🏠", "🌳", "🌻", "🦔", "🐿️", "🌈", "☀️", "🌤️", "🎪", "🏡"],
    critters: ["🐿️", "🦔", "🐇", "🐣", "🦢"],
    redHerrings: ["⚪", "🤍", "☁️", "🥚", "🧅", "🥏", "⚾", "🏐"],
    foreground: ["☁️", "🌸", "🍃", "💨"],
    atmosphere: ["sunshine", "breeze", "peaceful"],
    weather: ["clear", "butterflies"],
    colorPalette: ["#fef3c7", "#fde68a", "#fcd34d", "#d1fae5", "#a7f3d0"],
    timeOfDay: "afternoon",
    groundElements: ["🌻", "🌳", "🌸", "🌱"],
    skyElements: ["☀️", "☁️", "🌈", "🦋"],
  },
  fighting: {
    name: "Ancient Dojo",
    gradient: "from-red-900 via-orange-700 to-amber-600",
    baseElements: ["🥊", "💪", "❤️", "🟠", "🔴", "🟤", "⬛", "🧡", "🔥", "⚔️"],
    decorations: ["🏯", "⛩️", "🎌", "🥋", "🗡️", "🛡️", "🎯", "🏆", "🥇", "📿"],
    critters: ["🐉", "🦅", "🐯"],
    redHerrings: ["🍎", "🌹", "❤️", "🎈", "🍒", "🥊", "🎪", "🧧"],
    foreground: ["🔥", "💨", "🌸", "🍃"],
    atmosphere: ["energy", "focus", "power"],
    weather: ["cherry-blossoms", "energy"],
    colorPalette: ["#dc2626", "#ef4444", "#f97316", "#fb923c", "#fbbf24"],
    timeOfDay: "dawn",
    groundElements: ["🪨", "🎌", "⛩️", "🥋"],
    skyElements: ["🌅", "🌸", "☀️", "🦅"],
  },
  dragon: {
    name: "Dragon's Lair",
    gradient: "from-indigo-900 via-purple-700 to-red-600",
    baseElements: ["🐉", "💜", "💙", "🔵", "🟣", "❤️", "🔥", "✨", "👑", "💎"],
    decorations: ["🏰", "👑", "💎", "🗡️", "🛡️", "🪙", "📜", "🏔️", "⚔️", "🎭"],
    critters: ["🐉", "🦇", "🦅"],
    redHerrings: ["💎", "🔮", "🟣", "🍇", "🌂", "👾", "🎆", "💜"],
    foreground: ["🔥", "✨", "💨", "🌫️"],
    atmosphere: ["flames", "magic", "ancient"],
    weather: ["embers", "magic-sparkles"],
    colorPalette: ["#4338ca", "#6366f1", "#8b5cf6", "#a855f7", "#dc2626"],
    timeOfDay: "dusk",
    groundElements: ["💎", "🪙", "👑", "📜"],
    skyElements: ["🔥", "✨", "🐉", "🌙"],
  },
  dark: {
    name: "Midnight Forest",
    gradient: "from-gray-950 via-slate-900 to-purple-950",
    baseElements: ["🖤", "⬛", "🌑", "🟤", "💜", "🩶", "👁️", "💀", "🌙", "⭐"],
    decorations: ["🌙", "🦉", "🦇", "🐺", "🌲", "🕯️", "⭐", "🌌", "🪵", "🌿"],
    critters: ["🦉", "🦇", "🐺", "🐈‍⬛", "🦨"],
    redHerrings: ["🌑", "⚫", "🎱", "🖤", "☂️", "🎩", "🕳️", "📷"],
    foreground: ["🌫️", "🌙", "⬛", "🌲"],
    atmosphere: ["shadows", "moonlight", "mystery"],
    weather: ["mist", "moonbeams"],
    colorPalette: ["#1e1b4b", "#312e81", "#1f2937", "#111827", "#0f172a"],
    timeOfDay: "midnight",
    groundElements: ["🍂", "🪵", "🌲", "🌿"],
    skyElements: ["🌙", "⭐", "🦉", "🦇"],
  },
  steel: {
    name: "Steampunk Factory",
    gradient: "from-slate-700 via-gray-500 to-zinc-400",
    baseElements: ["⚙️", "🔩", "🩶", "⬛", "⚪", "🔘", "🔵", "🩵", "🔧", "⛓️"],
    decorations: ["🏭", "🏗️", "🔧", "🔨", "⛓️", "🤖", "🛠️", "🚂", "🔋", "📡"],
    critters: ["🤖", "⚙️", "🔩"],
    redHerrings: ["🥄", "🔗", "⚙️", "🩶", "🪙", "⚪", "🔘", "💿"],
    foreground: ["💨", "⚙️", "🌫️", "🔩"],
    atmosphere: ["steam", "sparks", "machinery"],
    weather: ["steam", "sparks"],
    colorPalette: ["#71717a", "#a1a1aa", "#d4d4d8", "#52525b", "#3f3f46"],
    timeOfDay: "industrial",
    groundElements: ["⚙️", "🔩", "🔧", "⛓️"],
    skyElements: ["💨", "⚙️", "🔋", "📡"],
  },
  fairy: {
    name: "Magical Kingdom",
    gradient: "from-pink-400 via-purple-300 to-cyan-300",
    baseElements: ["🩷", "💗", "💖", "✨", "⭐", "🌟", "💜", "🩵", "🌸", "🦋"],
    decorations: ["🦄", "🌈", "🍭", "🧁", "🎀", "👸", "🏰", "🪄", "🎠", "💝"],
    critters: ["🦄", "🦋", "🐇", "🕊️"],
    redHerrings: ["🌸", "🩷", "🍧", "🍬", "🎀", "💗", "🌷", "🧁"],
    foreground: ["✨", "🌸", "💫", "🌈"],
    atmosphere: ["sparkles", "magic", "rainbow"],
    weather: ["glitter", "hearts"],
    colorPalette: ["#f9a8d4", "#f472b6", "#ec4899", "#d946ef", "#a855f7"],
    timeOfDay: "magical",
    groundElements: ["🌸", "🍄", "✨", "🌺"],
    skyElements: ["🦋", "✨", "🌈", "⭐"],
  },
};

interface EnvironmentConfig {
  name: string;
  gradient: string;
  baseElements: string[];
  decorations: string[];
  critters: string[];
  redHerrings: string[];
  foreground: string[];
  atmosphere: string[];
  weather: string[];
  colorPalette: string[];
  timeOfDay: string;
  groundElements: string[];
  skyElements: string[];
}

interface SceneElement {
  id: string;
  content: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  isTarget?: boolean;
  layer: "sky" | "back" | "mid" | "front" | "ground" | "overlay";
  animation?: string;
  animationDelay?: number;
  blur?: boolean;
  glow?: boolean;
  flipX?: boolean;
}

// Get dominant color from Pokemon for camouflage matching
const getColorMatch = (pokemonColor: string): string[] => {
  const colorMap: Record<string, string[]> = {
    red: ["❤️", "🔴", "🧡", "🟠", "🔥", "💥", "🌹", "🍎", "🎈", "❤️‍🔥"],
    blue: ["💙", "🔵", "🩵", "💎", "🌊", "💧", "🫧", "🧿", "🌀", "💠"],
    yellow: ["💛", "🟡", "⭐", "✨", "⚡", "🌟", "🔆", "🌻", "🍋", "🌕"],
    green: ["💚", "🟢", "🌿", "🍃", "🌱", "☘️", "🍀", "🥒", "🥬", "🌲"],
    black: ["🖤", "⬛", "🌑", "💀", "🕳️", "⚫", "🎱", "🕶️", "🦇", "🌚"],
    white: ["🤍", "⚪", "💠", "❄️", "☁️", "🩶", "🥚", "🦢", "🕊️", "⭐"],
    brown: ["🟤", "🪨", "🍂", "🌰", "🪵", "🧱", "🐻", "☕", "🍪", "🥜"],
    purple: ["💜", "🟣", "🔮", "👾", "🍇", "🪻", "🌂", "👿", "🎆", "💟"],
    pink: ["🩷", "💗", "💖", "🌸", "🌺", "💕", "🎀", "🌷", "🦩", "🍧"],
    gray: ["🩶", "🔘", "🌫️", "🗻", "🪨", "⬜", "🦣", "🐘", "🌑", "💿"],
  };
  return colorMap[pokemonColor] || colorMap["gray"];
};

// Generate much richer, more complex scene for Easy mode
const generateEasyScene = (
  targetPokemon: Pokemon,
  sceneWidth: number,
  sceneHeight: number,
  densityMultiplier: number = 1
): {
  elements: SceneElement[];
  environment: EnvironmentConfig;
  targetPosition: { x: number; y: number };
  redHerrings: RedHerring[];
  foregroundObstacles: ForegroundObstacle[];
} => {
  const primaryType = targetPokemon.types[0].toLowerCase();
  const environment = typeEnvironments[primaryType] || typeEnvironments["normal"];

  const elements: SceneElement[] = [];
  const pokemonColorElements = getColorMatch(targetPokemon.color || "gray");

  const gridCols = 14;
  const gridRows = 10;
  const cellWidth = sceneWidth / gridCols;
  const cellHeight = sceneHeight / gridRows;

  const targetCol = 2 + Math.floor(Math.random() * (gridCols - 4));
  const targetRow = 2 + Math.floor(Math.random() * (gridRows - 4));
  const targetX = (targetCol + 0.5) * cellWidth;
  const targetY = (targetRow + 0.5) * cellHeight;

  // ===== SKY LAYER - distant background elements =====
  const skyCount = Math.floor(12 * densityMultiplier);
  for (let i = 0; i < skyCount; i++) {
    const skyElement = environment.skyElements[Math.floor(Math.random() * environment.skyElements.length)];
    elements.push({
      id: `sky-${i}`,
      content: skyElement,
      x: Math.random() * sceneWidth,
      y: Math.random() * (sceneHeight * 0.4), // Top 40% of screen
      size: 25 + Math.random() * 35,
      rotation: Math.random() * 20 - 10,
      opacity: 0.25 + Math.random() * 0.2,
      zIndex: 0,
      layer: "sky",
      animation: Math.random() > 0.6 ? "float" : undefined,
      animationDelay: Math.random() * 5,
      blur: Math.random() > 0.7,
    });
  }

  // ===== BACKGROUND LAYER - large scene-setting elements =====
  const bgCount = Math.floor(18 * densityMultiplier);
  for (let i = 0; i < bgCount; i++) {
    const decoration = environment.decorations[Math.floor(Math.random() * environment.decorations.length)];
    elements.push({
      id: `bg-${i}`,
      content: decoration,
      x: Math.random() * sceneWidth,
      y: Math.random() * sceneHeight,
      size: 45 + Math.random() * 40,
      rotation: Math.random() * 30 - 15,
      opacity: 0.3 + Math.random() * 0.25,
      zIndex: 1,
      layer: "back",
      animation: Math.random() > 0.75 ? "float" : undefined,
      animationDelay: Math.random() * 3,
      blur: Math.random() > 0.5,
    });
  }

  // ===== GROUND LAYER - floor elements =====
  const groundCount = Math.floor(20 * densityMultiplier);
  for (let i = 0; i < groundCount; i++) {
    const groundElement = environment.groundElements[Math.floor(Math.random() * environment.groundElements.length)];
    elements.push({
      id: `ground-${i}`,
      content: groundElement,
      x: Math.random() * sceneWidth,
      y: sceneHeight * 0.6 + Math.random() * (sceneHeight * 0.4), // Bottom 40%
      size: 20 + Math.random() * 30,
      rotation: Math.random() * 20 - 10,
      opacity: 0.5 + Math.random() * 0.3,
      zIndex: 2,
      layer: "ground",
      animation: undefined,
    });
  }

  // ===== MID LAYER - main camouflage elements =====
  const midCount = Math.floor(55 * densityMultiplier);
  for (let i = 0; i < midCount; i++) {
    const isNearTarget =
      Math.abs((i % gridCols) - targetCol) <= 2 &&
      Math.abs(Math.floor(i / gridCols) - targetRow) <= 2;

    // More color-matched elements near the target
    const elementPool = isNearTarget && Math.random() > 0.25
      ? [...pokemonColorElements, ...pokemonColorElements, ...environment.baseElements]
      : [...environment.baseElements, ...environment.decorations];

    const element = elementPool[Math.floor(Math.random() * elementPool.length)];

    elements.push({
      id: `mid-${i}`,
      content: element,
      x: Math.random() * sceneWidth,
      y: Math.random() * sceneHeight,
      size: 22 + Math.random() * 28,
      rotation: Math.random() * 50 - 25,
      opacity: 0.45 + Math.random() * 0.35,
      zIndex: 3 + Math.floor(Math.random() * 3),
      layer: "mid",
      animation: Math.random() > 0.85 ? "pulse" : undefined,
      animationDelay: Math.random() * 4,
      flipX: Math.random() > 0.5,
    });
  }

  // ===== CRITTER LAYER - small animated creatures =====
  const critterCount = Math.floor(8 * densityMultiplier);
  for (let i = 0; i < critterCount; i++) {
    const critter = environment.critters[Math.floor(Math.random() * environment.critters.length)];
    elements.push({
      id: `critter-${i}`,
      content: critter,
      x: Math.random() * sceneWidth,
      y: Math.random() * sceneHeight,
      size: 18 + Math.random() * 22,
      rotation: Math.random() * 30 - 15,
      opacity: 0.6 + Math.random() * 0.3,
      zIndex: 4,
      layer: "mid",
      animation: ["float", "sway", "pulse"][Math.floor(Math.random() * 3)],
      animationDelay: Math.random() * 5,
      flipX: Math.random() > 0.5,
    });
  }

  // ===== FRONT LAYER - smaller scattered elements =====
  const frontCount = Math.floor(70 * densityMultiplier);
  for (let i = 0; i < frontCount; i++) {
    const element = environment.baseElements[Math.floor(Math.random() * environment.baseElements.length)];

    elements.push({
      id: `front-${i}`,
      content: element,
      x: Math.random() * sceneWidth,
      y: Math.random() * sceneHeight,
      size: 14 + Math.random() * 22,
      rotation: Math.random() * 70 - 35,
      opacity: 0.35 + Math.random() * 0.45,
      zIndex: 6 + Math.floor(Math.random() * 2),
      layer: "front",
      animation: Math.random() > 0.88 ? "twinkle" : undefined,
      animationDelay: Math.random() * 3,
    });
  }

  // ===== CAMOUFLAGE RING - dense color-matched elements around target =====
  const camoCount = Math.floor((12 + Math.random() * 8) * densityMultiplier);
  for (let i = 0; i < camoCount; i++) {
    const angle = (i / camoCount) * Math.PI * 2 + Math.random() * 0.3;
    const distance = 25 + Math.random() * 60;
    const camoElement = pokemonColorElements[Math.floor(Math.random() * pokemonColorElements.length)];

    elements.push({
      id: `camo-${i}`,
      content: camoElement,
      x: targetX + Math.cos(angle) * distance,
      y: targetY + Math.sin(angle) * distance,
      size: 18 + Math.random() * 25,
      rotation: Math.random() * 360,
      opacity: 0.55 + Math.random() * 0.35,
      zIndex: 5,
      layer: "mid",
      glow: Math.random() > 0.8,
    });
  }

  // ===== SECONDARY CAMOUFLAGE - elements that specifically match Pokemon's colors =====
  const secondaryCamoCount = Math.floor(10 * densityMultiplier);
  for (let i = 0; i < secondaryCamoCount; i++) {
    const offsetX = (Math.random() - 0.5) * 150;
    const offsetY = (Math.random() - 0.5) * 150;
    const camoElement = pokemonColorElements[Math.floor(Math.random() * pokemonColorElements.length)];

    elements.push({
      id: `camo2-${i}`,
      content: camoElement,
      x: targetX + offsetX,
      y: targetY + offsetY,
      size: 20 + Math.random() * 20,
      rotation: Math.random() * 360,
      opacity: 0.5 + Math.random() * 0.4,
      zIndex: 4 + Math.floor(Math.random() * 2),
      layer: "mid",
    });
  }

  // ===== GENERATE RED HERRINGS - clickable distractions =====
  const redHerrings: RedHerring[] = [];
  const herringMessages = [
    "Nothing here! Keep looking!",
    "That's just a {item}!",
    "Nope, try again!",
    "Not the Pokemon!",
    "Just scenery!",
    "Keep searching, trainer!",
    "Almost! But not quite!",
    "Good try, but no Pokemon here!",
  ];

  const herringCount = difficultyConfig.easy.redHerringCount;
  for (let i = 0; i < herringCount; i++) {
    const herringEmoji = environment.redHerrings[Math.floor(Math.random() * environment.redHerrings.length)];
    let x, y, validPosition = false;
    let attempts = 0;

    while (!validPosition && attempts < 30) {
      x = 50 + Math.random() * (sceneWidth - 100);
      y = 50 + Math.random() * (sceneHeight - 100);

      const distFromTarget = Math.sqrt(Math.pow(x! - targetX, 2) + Math.pow(y! - targetY, 2));
      const tooCloseToOther = redHerrings.some(h =>
        Math.sqrt(Math.pow(x! - h.x, 2) + Math.pow(y! - h.y, 2)) < 60
      );

      if (distFromTarget > 70 && !tooCloseToOther) {
        validPosition = true;
      }
      attempts++;
    }

    if (validPosition) {
      redHerrings.push({
        id: `herring-${i}`,
        emoji: herringEmoji,
        x: x!,
        y: y!,
        size: 35 + Math.random() * 20,
        message: herringMessages[Math.floor(Math.random() * herringMessages.length)]
          .replace("{item}", herringEmoji),
        rotation: Math.random() * 30 - 15,
      });
    }
  }

  // ===== GENERATE FOREGROUND OBSTACLES =====
  const foregroundObstacles: ForegroundObstacle[] = [];
  const fgCount = difficultyConfig.easy.foregroundCount;

  for (let i = 0; i < fgCount; i++) {
    const fgElement = environment.foreground[Math.floor(Math.random() * environment.foreground.length)];
    foregroundObstacles.push({
      id: `fg-${i}`,
      content: fgElement,
      x: Math.random() * sceneWidth,
      y: Math.random() * sceneHeight,
      size: 60 + Math.random() * 50,
      opacity: 0.2 + Math.random() * 0.25,
      blur: Math.random() > 0.5,
    });
  }

  return {
    elements,
    environment,
    targetPosition: { x: targetX, y: targetY },
    redHerrings,
    foregroundObstacles,
  };
};

// ============================================
// GAME MESSAGES - Enhanced with more variety
// ============================================

const searchMessages = [
  "Keep looking! You're doing great!",
  "It's hiding somewhere sneaky...",
  "Look carefully at the colors!",
  "Try a different area!",
  "You're getting warmer! 🔥",
  "Don't give up, trainer!",
  "Check every corner!",
  "It's a tricky one!",
  "Look for something that moves!",
  "The Pokemon blends in well!",
  "Use your eagle eyes! 🦅",
  "It might be smaller than you think!",
  "Check near similar colors!",
  "You're so close! Keep going!",
];

const foundMessages = [
  "AMAZING! You found it! 🎉",
  "WOW! Great eyes, trainer! 👀",
  "INCREDIBLE! You spotted it! ⭐",
  "FANTASTIC discovery! 🌟",
  "You're a Pokemon MASTER! 👑",
  "SUPER detective work! 🔍",
  "BRILLIANT find! 💫",
  "You have EAGLE eyes! 🦅",
  "OUTSTANDING! What a catch! 🏆",
  "SPECTACULAR! You're amazing! ✨",
];

const hintMessages = [
  "Psst... look for something that doesn't quite fit!",
  "The Pokemon has eyes... look for them! 👀",
  "Try looking near the {color} things!",
  "It might be hiding among similar colors...",
  "Focus on the center area!",
  "Look for a shape that's different!",
  "Something here is alive... find it!",
  "The Pokemon is watching you... 👁️",
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function PokemonFinderGame() {
  const [gameScreen, setGameScreen] = useState<"menu" | "loading" | "playing" | "found">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [targetPokemon, setTargetPokemon] = useState<Pokemon | null>(null);
  const [scene, setScene] = useState<{
    elements: SceneElement[];
    environment: EnvironmentConfig;
    targetPosition: { x: number; y: number };
    redHerrings: RedHerring[];
    foregroundObstacles: ForegroundObstacle[];
  } | null>(null);
  const [aiBackground, setAiBackground] = useState<string | null>(null);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [decoys, setDecoys] = useState<DecoyPokemon[]>([]);
  const [clickedDecoy, setClickedDecoy] = useState<string | null>(null);
  const [clickedHerring, setClickedHerring] = useState<string | null>(null);
  const [clicks, setClicks] = useState(0);
  const [message, setMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [aiDescription, setAiDescription] = useState("");
  const [aiFact, setAiFact] = useState("");
  const [wiggle, setWiggle] = useState(false);

  const sceneWidth = 950;
  const sceneHeight = 650;

  // Generate decoy Pokemon positions with enhanced variety
  const generateDecoys = (
    target: Pokemon,
    targetPos: { x: number; y: number },
    count: number,
    size: number
  ): DecoyPokemon[] => {
    const decoyList: DecoyPokemon[] = [];

    // Get Pokemon of the same type first, then same color
    const sameType = getPokemonByType(target.types[0], target.id);
    const sameColor = getPokemonByColor(target.color || "", target.id);
    const candidates = [...sameType, ...sameColor];

    // Shuffle and pick unique decoys
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const uniqueDecoys = shuffled.filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    ).slice(0, count);

    // Generate positions that don't overlap with target
    const minDistance = 85;
    const padding = 65;

    for (const decoyPokemon of uniqueDecoys) {
      let attempts = 0;
      let x: number, y: number;
      let validPosition = false;

      while (!validPosition && attempts < 50) {
        x = padding + Math.random() * (sceneWidth - padding * 2);
        y = padding + Math.random() * (sceneHeight - padding * 2);

        // Check distance from target
        const distFromTarget = Math.sqrt(
          Math.pow(x - targetPos.x, 2) + Math.pow(y - targetPos.y, 2)
        );

        // Check distance from other decoys
        const tooCloseToDecoy = decoyList.some((d) => {
          const dist = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
          return dist < minDistance;
        });

        if (distFromTarget > minDistance && !tooCloseToDecoy) {
          validPosition = true;
        }
        attempts++;
      }

      if (validPosition) {
        // Add variety to decoys
        const hidingType = Math.random();
        let hiding: "none" | "partial" | "peeking" = "none";
        if (hidingType > 0.7) hiding = "partial";
        else if (hidingType > 0.85) hiding = "peeking";

        decoyList.push({
          pokemon: decoyPokemon,
          x: x!,
          y: y!,
          size: size + Math.random() * 15 - 7,
          rotation: Math.random() * 20 - 10,
          opacity: 0.85 + Math.random() * 0.15,
          flipX: Math.random() > 0.5,
          hiding,
          layer: Math.floor(Math.random() * 3),
        });
      }
    }

    return decoyList;
  };

  // Initialize game
  const startNewGame = useCallback(async (selectedDifficulty: Difficulty) => {
    if (selectedDifficulty === "hard") {
      return; // Coming soon
    }

    setDifficulty(selectedDifficulty);
    setGameScreen("loading");
    setClicks(0);
    setShowHint(false);
    setHintLevel(0);
    setMessage("");
    setAiDescription("");
    setAiFact("");
    setAiBackground(null);
    setDecoys([]);
    setClickedDecoy(null);
    setClickedHerring(null);
    setWiggle(false);

    // Pick random Pokemon
    const randomPokemon = originalPokemon[Math.floor(Math.random() * originalPokemon.length)];
    setTargetPokemon(randomPokemon);

    // Generate scene based on difficulty
    const config = difficultyConfig[selectedDifficulty];

    if (selectedDifficulty === "easy") {
      const newScene = generateEasyScene(randomPokemon, sceneWidth, sceneHeight, config.elementDensity);
      setScene(newScene);

      // Generate decoys
      const newDecoys = generateDecoys(
        randomPokemon,
        newScene.targetPosition,
        config.decoyCount,
        config.decoySize
      );
      setDecoys(newDecoys);

      // Generate AI description
      try {
        const response = await fetch("/api/ai/pokemon-finder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pokemon: {
              name: randomPokemon.name,
              types: randomPokemon.types,
              color: randomPokemon.color,
              genus: randomPokemon.genus,
              flavor_text: randomPokemon.flavor_text,
              habitat: randomPokemon.habitat,
              height: randomPokemon.height,
              weight: randomPokemon.weight,
            },
            environmentName: newScene.environment.name,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAiDescription(data.description || "");
          setAiFact(data.funFact || "");
        }
      } catch (error) {
        console.error("AI description error:", error);
      }

      whoosh();
      speak(`Can you find the ${randomPokemon.name} hiding in the ${newScene.environment.name}?`);
      setGameScreen("playing");
    } else if (selectedDifficulty === "medium") {
      // Generate AI background
      setIsGeneratingBackground(true);

      const primaryType = randomPokemon.types[0].toLowerCase();
      const environment = typeEnvironments[primaryType] || typeEnvironments["normal"];

      // Create minimal scene for positioning
      const targetX = 100 + Math.random() * (sceneWidth - 200);
      const targetY = 100 + Math.random() * (sceneHeight - 200);

      const targetPosition = { x: targetX, y: targetY };

      // Generate red herrings and foreground for medium mode too
      const redHerrings: RedHerring[] = [];
      const foregroundObstacles: ForegroundObstacle[] = [];

      for (let i = 0; i < config.redHerringCount; i++) {
        redHerrings.push({
          id: `herring-${i}`,
          emoji: environment.redHerrings[Math.floor(Math.random() * environment.redHerrings.length)],
          x: 50 + Math.random() * (sceneWidth - 100),
          y: 50 + Math.random() * (sceneHeight - 100),
          size: 35 + Math.random() * 20,
          message: "Not here! Keep looking!",
          rotation: Math.random() * 30 - 15,
        });
      }

      for (let i = 0; i < config.foregroundCount; i++) {
        foregroundObstacles.push({
          id: `fg-${i}`,
          content: environment.foreground[Math.floor(Math.random() * environment.foreground.length)],
          x: Math.random() * sceneWidth,
          y: Math.random() * sceneHeight,
          size: 70 + Math.random() * 60,
          opacity: 0.15 + Math.random() * 0.2,
          blur: Math.random() > 0.4,
        });
      }

      setScene({
        elements: [],
        environment,
        targetPosition,
        redHerrings,
        foregroundObstacles,
      });

      // Generate decoys for medium difficulty
      const newDecoys = generateDecoys(
        randomPokemon,
        targetPosition,
        config.decoyCount,
        config.decoySize
      );
      setDecoys(newDecoys);

      try {
        // Generate background image with ALL Pokemon data for sophisticated prompt
        const bgResponse = await fetch("/api/ai/generate-background", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: randomPokemon.name,
            types: randomPokemon.types,
            color: randomPokemon.color,
            shape: randomPokemon.shape,
            habitat: randomPokemon.habitat,
            genus: randomPokemon.genus,
            flavor_text: randomPokemon.flavor_text,
            height: randomPokemon.height,
            weight: randomPokemon.weight,
            is_legendary: randomPokemon.is_legendary,
            is_mythical: randomPokemon.is_mythical,
            generation: randomPokemon.generation,
          }),
        });

        if (bgResponse.ok) {
          const bgData = await bgResponse.json();
          if (bgData.image) {
            setAiBackground(bgData.image);
          }
        }

        // Also get description
        const descResponse = await fetch("/api/ai/pokemon-finder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pokemon: {
              name: randomPokemon.name,
              types: randomPokemon.types,
              color: randomPokemon.color,
              genus: randomPokemon.genus,
              flavor_text: randomPokemon.flavor_text,
              habitat: randomPokemon.habitat,
              height: randomPokemon.height,
              weight: randomPokemon.weight,
            },
            environmentName: environment.name,
          }),
        });

        if (descResponse.ok) {
          const descData = await descResponse.json();
          setAiDescription(descData.description || "");
          setAiFact(descData.funFact || "");
        }
      } catch (error) {
        console.error("AI generation error:", error);
      }

      setIsGeneratingBackground(false);
      whoosh();
      speak(`Can you find the ${randomPokemon.name} in this tricky scene?`);
      setGameScreen("playing");
    }
  }, []);

  // Progressive hints
  useEffect(() => {
    if (gameScreen !== "playing" || !targetPokemon) return;

    const config = difficultyConfig[difficulty];

    const hintTimer = setTimeout(() => {
      setShowHint(true);
      setHintLevel(1);
    }, config.hintDelay);

    const wiggleTimer = setTimeout(() => {
      setWiggle(true);
      setHintLevel(2);
    }, config.wiggleDelay);

    return () => {
      clearTimeout(hintTimer);
      clearTimeout(wiggleTimer);
    };
  }, [gameScreen, targetPokemon, difficulty]);

  // Handle clicking on the Pokemon
  const handlePokemonClick = () => {
    if (gameScreen !== "playing") return;

    setGameScreen("found");
    const msg = foundMessages[Math.floor(Math.random() * foundMessages.length)];
    setMessage(msg);

    success();
    playSound("win");
    celebrateWin();

    if (targetPokemon) {
      setTimeout(() => {
        speak(`You found ${targetPokemon.name}! ${aiFact || `${targetPokemon.name} is a ${targetPokemon.types.join(" and ")} type Pokemon!`}`);
      }, 1500);
    }
  };

  // Handle clicking on a decoy
  const handleDecoyClick = (decoy: DecoyPokemon) => {
    if (gameScreen !== "playing") return;

    setClicks((c) => c + 1);
    playSound("error");

    const wrongMessages = [
      `That's ${decoy.pokemon.name}, not ${targetPokemon?.name}!`,
      `Oops! That's a ${decoy.pokemon.name}!`,
      `Close, but that's ${decoy.pokemon.name}!`,
      `Nope! ${decoy.pokemon.name} is not the one!`,
      `Keep looking! That's ${decoy.pokemon.name}!`,
      `${decoy.pokemon.name} says hi, but keep searching!`,
      `Nice try! That's just ${decoy.pokemon.name}!`,
    ];

    const msg = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
    setMessage(msg);
    setClickedDecoy(decoy.pokemon.name);

    setTimeout(() => {
      setMessage("");
      setClickedDecoy(null);
    }, 2500);
  };

  // Handle clicking on a red herring
  const handleHerringClick = (herring: RedHerring) => {
    if (gameScreen !== "playing") return;

    setClicks((c) => c + 1);
    pop();

    setMessage(herring.message);
    setClickedHerring(herring.id);

    setTimeout(() => {
      setMessage("");
      setClickedHerring(null);
    }, 2000);
  };

  // Handle clicking elsewhere
  const handleSceneClick = () => {
    if (gameScreen !== "playing") return;

    setClicks((c) => c + 1);
    pop();

    const msg = searchMessages[Math.floor(Math.random() * searchMessages.length)];
    setMessage(msg);

    setTimeout(() => setMessage(""), 2000);
  };

  // Get hint based on level
  const getHint = () => {
    if (!targetPokemon || !scene) return "";

    if (hintLevel === 1) {
      return hintMessages[Math.floor(Math.random() * hintMessages.length)]
        .replace("{color}", targetPokemon.color || "colorful");
    }
    if (hintLevel >= 2) {
      return `Look for ${targetPokemon.name}... it's wiggling! 👀`;
    }
    return "";
  };

  const pokemonSize = difficultyConfig[difficulty].pokemonSize;

  // ============================================
  // MENU SCREEN
  // ============================================
  if (gameScreen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-800 to-pink-700 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="text-8xl mb-4 animate-bounce">🔍</div>
            <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg mb-4">
              Pokemon Finder!
            </h1>
            <p className="text-xl text-white/80">
              Can you spot the hidden Pokemon?
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Choose Your Difficulty
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      click();
                      if (key !== "hard") {
                        startNewGame(key);
                      }
                    }}
                    disabled={key === "hard"}
                    className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-300 ${
                      key === "hard"
                        ? "opacity-60 cursor-not-allowed bg-gray-600"
                        : `bg-gradient-to-br ${config.color} hover:scale-105 hover:shadow-2xl cursor-pointer`
                    }`}
                  >
                    <div className="text-5xl mb-3">{config.emoji}</div>
                    <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                    <p className="text-white/80">{config.description}</p>
                    <p className="text-xs text-white/60 mt-2">
                      {key === "easy" && "4 decoys • 8 tricks"}
                      {key === "medium" && "8 decoys • 12 tricks • AI art"}
                      {key === "hard" && "12 decoys • 16 tricks"}
                    </p>
                    {key === "hard" && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-black/50 px-4 py-2 rounded-full text-sm font-bold">
                          🔒 Coming Soon!
                        </span>
                      </div>
                    )}
                  </button>
                )
              )}
            </div>

            <div className="mt-10 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 inline-block">
                <h3 className="text-xl font-bold text-white mb-3">How to Play</h3>
                <ul className="text-white/80 text-left space-y-2">
                  <li>🔍 Search the scene for the hidden Pokemon</li>
                  <li>👆 Click on the Pokemon when you find it</li>
                  <li>⚠️ Watch out for decoys and tricks!</li>
                  <li>💡 Hints appear if you need help</li>
                  <li>⭐ Fewer clicks = more stars!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // LOADING SCREEN
  // ============================================
  if (gameScreen === "loading" || !targetPokemon || !scene) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🔍</div>
          <h1 className="text-4xl font-bold text-white mb-4">Pokemon Finder</h1>
          <p className="text-xl text-white/80 animate-pulse">
            {isGeneratingBackground
              ? "🎨 Creating your AI scene..."
              : "🌟 Building your adventure..."}
          </p>
          <div className="mt-4 w-64 mx-auto">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-loading-bar" />
            </div>
          </div>
          {targetPokemon && (
            <p className="mt-4 text-white/60 text-sm">
              Hiding {targetPokemon.name} really well...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // GAME SCREEN
  // ============================================
  return (
    <div className={`min-h-screen bg-gradient-to-b ${scene.environment.gradient} py-4`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <button
              onClick={() => setGameScreen("menu")}
              className="text-white/70 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              Pokemon Finder! 🔍
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${difficultyConfig[difficulty].color}`}>
              {difficultyConfig[difficulty].name}
            </span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 inline-block">
            <p className="text-xl text-white font-medium">
              {gameScreen === "found" ? (
                <span className="text-yellow-300">🎉 {message}</span>
              ) : (
                <>Find <span className="text-yellow-300 font-bold">{targetPokemon.name}</span> in the {scene.environment.name}!</>
              )}
            </p>
          </div>
        </div>

        {/* AI Description */}
        {aiDescription && gameScreen === "playing" && (
          <div className="max-w-2xl mx-auto mb-4">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 text-white/90 text-center">
              <p className="text-sm md:text-base italic">💭 {aiDescription}</p>
            </div>
          </div>
        )}

        {/* Game Scene */}
        <div className="flex justify-center mb-4">
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 cursor-crosshair select-none"
            style={{ width: sceneWidth, height: sceneHeight }}
            onClick={handleSceneClick}
          >
            {/* Background - either AI generated or gradient */}
            {difficulty === "medium" && aiBackground ? (
              <img
                src={aiBackground}
                alt="AI Generated Scene"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${scene.environment.gradient}`} />

                {/* Atmospheric Overlay based on time of day */}
                <div className={`absolute inset-0 pointer-events-none ${
                  scene.environment.timeOfDay === "night" || scene.environment.timeOfDay === "midnight"
                    ? "bg-gradient-to-b from-black/30 to-transparent"
                    : scene.environment.timeOfDay === "sunset" || scene.environment.timeOfDay === "dusk"
                    ? "bg-gradient-to-b from-orange-500/20 to-purple-500/20"
                    : scene.environment.timeOfDay === "dawn"
                    ? "bg-gradient-to-b from-pink-500/15 to-yellow-500/10"
                    : ""
                }`} />

                {/* Enhanced Atmosphere effects */}
                <div className="absolute inset-0 pointer-events-none">
                  {scene.environment.atmosphere.includes("bubbles") && (
                    <div className="absolute inset-0 opacity-35">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <span
                          key={`bubble-${i}`}
                          className="absolute animate-rise"
                          style={{
                            left: `${Math.random() * 100}%`,
                            bottom: `-${Math.random() * 20}%`,
                            fontSize: `${15 + Math.random() * 20}px`,
                            animationDelay: `${Math.random() * 8}s`,
                            animationDuration: `${6 + Math.random() * 6}s`,
                          }}
                        >
                          🫧
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("snowfall") && (
                    <div className="absolute inset-0 opacity-50">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <span
                          key={`snow-${i}`}
                          className="absolute animate-fall"
                          style={{
                            left: `${Math.random() * 100}%`,
                            fontSize: `${12 + Math.random() * 15}px`,
                            animationDelay: `${Math.random() * 6}s`,
                            animationDuration: `${5 + Math.random() * 4}s`,
                          }}
                        >
                          ❄️
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("sparkles") && (
                    <div className="absolute inset-0 opacity-60">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <span
                          key={`sparkle-${i}`}
                          className="absolute animate-twinkle"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            fontSize: `${10 + Math.random() * 18}px`,
                            animationDelay: `${Math.random() * 4}s`,
                          }}
                        >
                          {["✨", "⭐", "💫", "🌟"][Math.floor(Math.random() * 4)]}
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("leaves") && (
                    <div className="absolute inset-0 opacity-45">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <span
                          key={`leaf-${i}`}
                          className="absolute animate-drift"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            fontSize: `${15 + Math.random() * 18}px`,
                            animationDelay: `${Math.random() * 5}s`,
                          }}
                        >
                          {["🍃", "🍂", "🌿"][Math.floor(Math.random() * 3)]}
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("fireflies") && (
                    <div className="absolute inset-0 opacity-70">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <span
                          key={`firefly-${i}`}
                          className="absolute animate-firefly"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            fontSize: `${8 + Math.random() * 10}px`,
                            animationDelay: `${Math.random() * 6}s`,
                          }}
                        >
                          ✨
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("ember") && (
                    <div className="absolute inset-0 opacity-45">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <span
                          key={`ember-${i}`}
                          className="absolute animate-rise"
                          style={{
                            left: `${Math.random() * 100}%`,
                            bottom: `-5%`,
                            fontSize: `${8 + Math.random() * 14}px`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${4 + Math.random() * 4}s`,
                          }}
                        >
                          {["🔥", "✨", "💫"][Math.floor(Math.random() * 3)]}
                        </span>
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("fog") && (
                    <div className="absolute inset-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={`fog-${i}`}
                          className="absolute w-full h-32 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-drift-slow"
                          style={{
                            top: `${20 + i * 18}%`,
                            animationDelay: `${i * 2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {scene.environment.atmosphere.includes("stardust") && (
                    <div className="absolute inset-0 opacity-50">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <span
                          key={`star-${i}`}
                          className="absolute animate-twinkle-slow"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            fontSize: `${6 + Math.random() * 12}px`,
                            animationDelay: `${Math.random() * 5}s`,
                          }}
                        >
                          {["⭐", "✨", "💫", "🌟", "✴️"][Math.floor(Math.random() * 5)]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scene elements for Easy mode - layered */}
                {difficulty === "easy" && scene.elements.map((element) => (
                  <span
                    key={element.id}
                    className={`absolute select-none pointer-events-none transition-transform ${
                      element.animation === "float" ? "animate-float" :
                      element.animation === "pulse" ? "animate-pulse" :
                      element.animation === "twinkle" ? "animate-twinkle" :
                      element.animation === "sway" ? "animate-sway" : ""
                    } ${element.blur ? "blur-[1px]" : ""} ${element.glow ? "drop-shadow-glow" : ""}`}
                    style={{
                      left: element.x,
                      top: element.y,
                      fontSize: element.size,
                      transform: `translate(-50%, -50%) rotate(${element.rotation}deg) ${element.flipX ? "scaleX(-1)" : ""}`,
                      opacity: element.opacity,
                      zIndex: element.zIndex,
                      animationDelay: element.animationDelay ? `${element.animationDelay}s` : undefined,
                    }}
                  >
                    {element.content}
                  </span>
                ))}
              </>
            )}

            {/* Red Herrings - clickable distractions */}
            {scene.redHerrings.map((herring) => (
              <div
                key={herring.id}
                className={`absolute cursor-pointer transition-all duration-200 hover:scale-125 ${
                  clickedHerring === herring.id ? "animate-shake scale-90 opacity-50" : ""
                }`}
                style={{
                  left: herring.x,
                  top: herring.y,
                  transform: `translate(-50%, -50%) rotate(${herring.rotation}deg)`,
                  fontSize: herring.size,
                  zIndex: 7,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHerringClick(herring);
                }}
              >
                {herring.emoji}
              </div>
            ))}

            {/* Decoy Pokemon */}
            {decoys.map((decoy, index) => (
              <div
                key={`decoy-${decoy.pokemon.id}-${index}`}
                className={`absolute cursor-pointer transition-all duration-200 hover:scale-110 ${
                  clickedDecoy === decoy.pokemon.name ? "animate-shake" : ""
                } ${decoy.hiding === "partial" ? "opacity-80" : ""}`}
                style={{
                  left: decoy.x,
                  top: decoy.y,
                  transform: `translate(-50%, -50%) rotate(${decoy.rotation}deg) ${decoy.flipX ? "scaleX(-1)" : ""}`,
                  zIndex: 8 + decoy.layer,
                  opacity: decoy.opacity,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecoyClick(decoy);
                }}
              >
                <Image
                  src={`/pokemon/${decoy.pokemon.id}.png`}
                  alt={decoy.pokemon.name}
                  width={decoy.size}
                  height={decoy.size}
                  className={`drop-shadow-lg transition-all ${
                    clickedDecoy === decoy.pokemon.name ? "opacity-50 grayscale" : ""
                  } ${decoy.hiding === "peeking" ? "clip-path-peek" : ""}`}
                  draggable={false}
                />
              </div>
            ))}

            {/* Target Pokemon */}
            <div
              className={`absolute cursor-pointer transition-all duration-200 hover:scale-110 ${
                wiggle ? "animate-wiggle" : ""
              } ${gameScreen === "found" ? "animate-bounce scale-125 z-50" : ""}`}
              style={{
                left: scene.targetPosition.x,
                top: scene.targetPosition.y,
                transform: "translate(-50%, -50%)",
                zIndex: gameScreen === "found" ? 100 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handlePokemonClick();
              }}
            >
              <div className={`relative ${gameScreen === "found" ? "ring-4 ring-yellow-400 rounded-full p-1 bg-yellow-400/30" : ""}`}>
                <Image
                  src={`/pokemon/${targetPokemon.id}.png`}
                  alt={targetPokemon.name}
                  width={pokemonSize}
                  height={pokemonSize}
                  className={`drop-shadow-lg ${gameScreen === "found" ? "brightness-110" : ""}`}
                  draggable={false}
                />
                {gameScreen === "found" && (
                  <>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
                      🎉
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="bg-yellow-400 text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                        {targetPokemon.name}!
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Foreground obstacles - semi-transparent overlays */}
            {scene.foregroundObstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                className={`absolute pointer-events-none ${obstacle.blur ? "blur-sm" : ""}`}
                style={{
                  left: obstacle.x,
                  top: obstacle.y,
                  transform: "translate(-50%, -50%)",
                  fontSize: obstacle.size,
                  opacity: obstacle.opacity,
                  zIndex: 15,
                }}
              >
                {obstacle.content}
              </div>
            ))}

            {/* Click feedback message */}
            {message && gameScreen === "playing" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-full px-6 py-2 shadow-lg animate-fade-in z-50">
                <p className="text-lg font-medium text-gray-800">{message}</p>
              </div>
            )}

            {/* Vignette effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/20" />
          </div>
        </div>

        {/* Hint area */}
        {showHint && gameScreen === "playing" && (
          <div className="text-center mb-4">
            <div className="inline-block bg-yellow-400/90 rounded-full px-6 py-2 shadow-lg animate-pulse">
              <p className="text-lg font-medium text-gray-900">
                💡 {getHint()}
              </p>
            </div>
          </div>
        )}

        {/* Victory panel */}
        {gameScreen === "found" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="relative">
                  <Image
                    src={`/pokemon/${targetPokemon.id}.png`}
                    alt={targetPokemon.name}
                    width={100}
                    height={100}
                    className="drop-shadow-lg"
                  />
                  <div className="absolute -top-2 -right-2 text-2xl">🏆</div>
                </div>
                <div className="text-left">
                  <h2 className="text-3xl font-bold text-gray-800 capitalize">
                    {targetPokemon.name}
                  </h2>
                  <p className="text-gray-600">
                    {targetPokemon.types.join(" / ")} Type
                  </p>
                  <p className="text-sm text-gray-500">
                    {targetPokemon.genus}
                  </p>
                </div>
              </div>

              {aiFact && (
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl p-4 mb-4">
                  <p className="text-gray-700 font-medium">🌟 {aiFact}</p>
                </div>
              )}

              <div className="flex justify-center gap-2 mb-4">
                {Array.from({ length: Math.min(5, Math.max(1, 6 - Math.floor(clicks / 3))) }).map((_, i) => (
                  <span key={i} className="text-3xl animate-pop" style={{ animationDelay: `${i * 0.1}s` }}>⭐</span>
                ))}
              </div>

              <p className="text-gray-600 mb-4">
                Found in {clicks} {clicks === 1 ? "click" : "clicks"}!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => startNewGame(difficulty)}
                  className={`bg-gradient-to-r ${difficultyConfig[difficulty].color} text-white text-xl font-bold px-8 py-4 rounded-full hover:scale-105 transition-transform shadow-lg`}
                >
                  Play Again! 🔍
                </button>
                <button
                  onClick={() => setGameScreen("menu")}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white text-lg font-bold px-6 py-4 rounded-full hover:scale-105 transition-transform shadow-lg"
                >
                  Change Difficulty
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {gameScreen === "playing" && (
          <div className="text-center">
            <div className="inline-flex gap-6 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
              <div className="text-white">
                <span className="opacity-70">Clicks: </span>
                <span className="font-bold">{clicks}</span>
              </div>
              <div className="text-white/70">
                <span className="opacity-70">Decoys: </span>
                <span className="font-bold">{decoys.length}</span>
              </div>
              <button
                onClick={() => {
                  setShowHint(true);
                  setHintLevel((h) => Math.min(h + 1, 2));
                }}
                className="text-yellow-300 hover:text-yellow-100 font-medium transition-colors"
              >
                💡 Need a hint?
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-12px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes twinkle-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
        @keyframes fall {
          0% { transform: translateY(-100vh) rotate(0deg); }
          100% { transform: translateY(100vh) rotate(360deg); }
        }
        @keyframes rise {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120vh) rotate(180deg); opacity: 0; }
        }
        @keyframes sway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(12px) rotate(6deg); }
          75% { transform: translateX(-12px) rotate(-6deg); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, 10px) rotate(5deg); }
          50% { transform: translate(-10px, 20px) rotate(-3deg); }
          75% { transform: translate(-20px, 5px) rotate(3deg); }
        }
        @keyframes drift-slow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes firefly {
          0%, 100% { opacity: 0; transform: translate(0, 0); }
          20% { opacity: 1; }
          50% { opacity: 0.5; transform: translate(30px, -20px); }
          80% { opacity: 1; }
        }
        @keyframes wiggle {
          0%, 100% { transform: translate(-50%, -50%) rotate(-4deg); }
          50% { transform: translate(-50%, -50%) rotate(4deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) translateX(-6px) rotate(-3deg); }
          20%, 40%, 60%, 80% { transform: translate(-50%, -50%) translateX(6px) rotate(3deg); }
        }
        @keyframes pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 75%; }
          100% { width: 100%; }
        }
        .animate-float {
          animation: float 3.5s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 2.5s ease-in-out infinite;
        }
        .animate-twinkle-slow {
          animation: twinkle-slow 4s ease-in-out infinite;
        }
        .animate-fall {
          animation: fall 8s linear infinite;
        }
        .animate-rise {
          animation: rise 8s linear infinite;
        }
        .animate-sway {
          animation: sway 4.5s ease-in-out infinite;
        }
        .animate-drift {
          animation: drift 8s ease-in-out infinite;
        }
        .animate-drift-slow {
          animation: drift-slow 20s linear infinite;
        }
        .animate-firefly {
          animation: firefly 6s ease-in-out infinite;
        }
        .animate-wiggle {
          animation: wiggle 0.35s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-pop {
          animation: pop 0.4s ease-out forwards;
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
