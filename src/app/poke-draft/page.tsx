"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";

// Type colors for display
const typeColors: Record<string, string> = {
  normal: "bg-gray-400",
  fire: "bg-red-500",
  water: "bg-blue-500",
  electric: "bg-yellow-400",
  grass: "bg-green-500",
  ice: "bg-cyan-300",
  fighting: "bg-orange-700",
  poison: "bg-purple-500",
  ground: "bg-amber-600",
  flying: "bg-indigo-300",
  psychic: "bg-pink-500",
  bug: "bg-lime-500",
  rock: "bg-stone-500",
  ghost: "bg-purple-700",
  dragon: "bg-violet-600",
  dark: "bg-gray-700",
  steel: "bg-slate-400",
  fairy: "bg-pink-300",
};

// Type effectiveness chart for battle simulation
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

const getTypeColor = (type: string): string => typeColors[type] || "bg-gray-500";

// Role definitions
type Role = "tank" | "sweeper" | "support";

interface DraftedPokemon extends Pokemon {
  role?: Role;
}

// Calculate role scores for a Pokemon
function getRoleScores(p: Pokemon): { tank: number; sweeper: number; support: number } {
  return {
    tank: p.hp + p.defense + (p.hp * 0.5),
    sweeper: Math.max(p.attack, p.special_attack) + p.speed,
    support: p.special_defense + p.hp * 0.3 + p.defense * 0.3,
  };
}

// Assign best role for a Pokemon
function getBestRole(p: Pokemon): Role {
  const scores = getRoleScores(p);
  if (scores.tank >= scores.sweeper && scores.tank >= scores.support) return "tank";
  if (scores.sweeper >= scores.support) return "sweeper";
  return "support";
}

// Check if team meets role requirements
function checkRoleRequirements(team: DraftedPokemon[]): { tank: boolean; sweeper: boolean; support: boolean } {
  const roles = team.map(p => getBestRole(p));
  return {
    tank: roles.includes("tank"),
    sweeper: roles.includes("sweeper"),
    support: roles.includes("support"),
  };
}

// Get team's primary types
function getTeamTypes(team: DraftedPokemon[]): string[] {
  return team.map(p => p.types[0]);
}

// Check if a Pokemon can be drafted (no duplicate primary types)
function canDraft(team: DraftedPokemon[], candidate: Pokemon): boolean {
  const teamTypes = getTeamTypes(team);
  return !teamTypes.includes(candidate.types[0]);
}

// Calculate type coverage score
function getTypeCoverage(team: DraftedPokemon[]): number {
  const coveredTypes = new Set<string>();

  for (const p of team) {
    for (const attackType of p.types) {
      const chart = TYPE_CHART[attackType] || {};
      for (const [defType, mult] of Object.entries(chart)) {
        if (mult >= 2) coveredTypes.add(defType);
      }
    }
  }

  return coveredTypes.size;
}

// Calculate total base stats
function getTotalStats(team: DraftedPokemon[]): number {
  return team.reduce((sum, p) =>
    sum + p.hp + p.attack + p.defense + p.special_attack + p.special_defense + p.speed, 0);
}

// Simple battle simulation
function simulateBattle(team1: DraftedPokemon[], team2: DraftedPokemon[]): {
  winner: "player" | "rival";
  score1: number;
  score2: number;
  highlights: string[];
} {
  const highlights: string[] = [];

  // Calculate team scores
  const stats1 = getTotalStats(team1);
  const stats2 = getTotalStats(team2);
  const coverage1 = getTypeCoverage(team1);
  const coverage2 = getTypeCoverage(team2);

  // Type advantage calculation
  let typeAdv1 = 0;
  let typeAdv2 = 0;

  for (const p1 of team1) {
    for (const p2 of team2) {
      for (const type of p1.types) {
        const chart = TYPE_CHART[type] || {};
        for (const defType of p2.types) {
          if (chart[defType] && chart[defType] >= 2) typeAdv1 += 1;
        }
      }
      for (const type of p2.types) {
        const chart = TYPE_CHART[type] || {};
        for (const defType of p1.types) {
          if (chart[defType] && chart[defType] >= 2) typeAdv2 += 1;
        }
      }
    }
  }

  // Role bonus
  const roles1 = checkRoleRequirements(team1);
  const roles2 = checkRoleRequirements(team2);
  const roleBonus1 = (roles1.tank ? 50 : 0) + (roles1.sweeper ? 50 : 0) + (roles1.support ? 50 : 0);
  const roleBonus2 = (roles2.tank ? 50 : 0) + (roles2.sweeper ? 50 : 0) + (roles2.support ? 50 : 0);

  // Final scores
  const score1 = stats1 + (coverage1 * 20) + (typeAdv1 * 30) + roleBonus1;
  const score2 = stats2 + (coverage2 * 20) + (typeAdv2 * 30) + roleBonus2;

  // Generate battle highlights
  const bestSweeper1 = [...team1].sort((a, b) =>
    Math.max(b.attack, b.special_attack) + b.speed - Math.max(a.attack, a.special_attack) - a.speed)[0];
  const bestSweeper2 = [...team2].sort((a, b) =>
    Math.max(b.attack, b.special_attack) + b.speed - Math.max(a.attack, a.special_attack) - a.speed)[0];
  const bestTank1 = [...team1].sort((a, b) => b.hp + b.defense - a.hp - a.defense)[0];
  const bestTank2 = [...team2].sort((a, b) => b.hp + b.defense - a.hp - a.defense)[0];

  highlights.push(`${bestSweeper1.name} opens with a powerful attack!`);
  highlights.push(`${bestTank2.name} tanks the hit and counters!`);
  highlights.push(`${bestSweeper2.name} threatens with incredible speed!`);
  highlights.push(`${bestTank1.name} holds the line for the team!`);

  if (typeAdv1 > typeAdv2) {
    highlights.push(`Type advantages favor the player's team!`);
  } else if (typeAdv2 > typeAdv1) {
    highlights.push(`The rival's type coverage proves crucial!`);
  }

  return {
    winner: score1 > score2 ? "player" : "rival",
    score1,
    score2,
    highlights,
  };
}

// AI rival names and personalities
const RIVAL_NAMES = ["Gary", "Silver", "Blue", "Gladion", "Hop", "Bede"];

// Generate draft choices - 3 options per pick
function generateChoices(
  availablePool: Pokemon[],
  playerTeam: DraftedPokemon[],
  rivalTeam: DraftedPokemon[],
  isPlayerPick: boolean
): Pokemon[] {
  const team = isPlayerPick ? playerTeam : rivalTeam;

  // Filter to valid candidates (no duplicate primary types)
  const validCandidates = availablePool.filter(p => canDraft(team, p));

  if (validCandidates.length === 0) return [];

  // Sort by total stats to get a mix
  const sorted = [...validCandidates].sort((a, b) =>
    (b.hp + b.attack + b.defense + b.special_attack + b.special_defense + b.speed) -
    (a.hp + a.attack + a.defense + a.special_attack + a.special_defense + a.speed)
  );

  // Pick from different tiers
  const choices: Pokemon[] = [];
  const topTier = sorted.slice(0, Math.ceil(sorted.length * 0.2));
  const midTier = sorted.slice(Math.ceil(sorted.length * 0.2), Math.ceil(sorted.length * 0.6));
  const lowTier = sorted.slice(Math.ceil(sorted.length * 0.6));

  // Add one from each tier if available
  if (topTier.length > 0) {
    choices.push(topTier[Math.floor(Math.random() * topTier.length)]);
  }
  if (midTier.length > 0) {
    const midPick = midTier[Math.floor(Math.random() * midTier.length)];
    if (!choices.find(c => c.id === midPick.id)) choices.push(midPick);
  }
  if (lowTier.length > 0) {
    const lowPick = lowTier[Math.floor(Math.random() * lowTier.length)];
    if (!choices.find(c => c.id === lowPick.id)) choices.push(lowPick);
  }

  // Fill remaining slots
  while (choices.length < 3 && validCandidates.length > choices.length) {
    const randomPick = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    if (!choices.find(c => c.id === randomPick.id)) {
      choices.push(randomPick);
    }
  }

  return choices.slice(0, 3);
}

// AI pick logic - smart heuristics
function makeAIPick(
  choices: Pokemon[],
  rivalTeam: DraftedPokemon[],
  playerTeam: DraftedPokemon[]
): Pokemon {
  // Check what roles the AI needs
  const roles = checkRoleRequirements(rivalTeam);

  // Score each choice
  const scored = choices.map(p => {
    let score = p.hp + p.attack + p.defense + p.special_attack + p.special_defense + p.speed;

    const role = getBestRole(p);

    // Bonus for filling needed roles
    if (!roles.tank && role === "tank") score += 100;
    if (!roles.sweeper && role === "sweeper") score += 100;
    if (!roles.support && role === "support") score += 100;

    // Bonus for type coverage against player
    for (const type of p.types) {
      const chart = TYPE_CHART[type] || {};
      for (const playerPoke of playerTeam) {
        for (const defType of playerPoke.types) {
          if (chart[defType] && chart[defType] >= 2) score += 30;
        }
      }
    }

    // Legendary/mythical bonus
    if (p.is_legendary || p.is_mythical) score += 50;

    return { pokemon: p, score };
  });

  // Sort by score and pick best
  scored.sort((a, b) => b.score - a.score);
  return scored[0].pokemon;
}

type GamePhase = "intro" | "drafting" | "battle" | "results";

export default function PokeDraftPage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [rivalName, setRivalName] = useState("");
  const [playerTeam, setPlayerTeam] = useState<DraftedPokemon[]>([]);
  const [rivalTeam, setRivalTeam] = useState<DraftedPokemon[]>([]);
  const [availablePool, setAvailablePool] = useState<Pokemon[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Pokemon[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [pickNumber, setPickNumber] = useState(1);
  const [aiCommentary, setAiCommentary] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [battleResult, setBattleResult] = useState<{
    winner: "player" | "rival";
    score1: number;
    score2: number;
    highlights: string[];
  } | null>(null);
  const [battleNarration, setBattleNarration] = useState<string[]>([]);
  const [currentNarrationIndex, setCurrentNarrationIndex] = useState(0);

  const { name: playerName } = usePlayer();

  // Initialize game
  const startGame = useCallback(() => {
    // Pick a random rival
    const rival = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];
    setRivalName(rival);

    // Create pool of strong Pokemon (filter out very weak ones)
    const strongPokemon = pokemon.filter(p =>
      p.hp + p.attack + p.defense + p.special_attack + p.special_defense + p.speed >= 300
    );

    // Shuffle and take a subset for the draft
    const shuffled = [...strongPokemon].sort(() => Math.random() - 0.5);
    const pool = shuffled.slice(0, 50);

    setAvailablePool(pool);
    setPlayerTeam([]);
    setRivalTeam([]);
    setPickNumber(1);
    setIsPlayerTurn(true);
    setBattleResult(null);
    setBattleNarration([]);
    setCurrentNarrationIndex(0);

    // Generate initial choices for player
    const choices = generateChoices(pool, [], [], true);
    setCurrentChoices(choices);

    setPhase("drafting");

    // AI opening taunt
    fetchAiCommentary(rival, "opening", null, playerName);

    playSound('powerup');
    speak(`${rival} challenges you to a Pokemon draft battle!`);
  }, [playerName]);

  // Fetch AI commentary from API
  const fetchAiCommentary = async (
    rival: string,
    event: "opening" | "player_pick" | "rival_pick" | "battle_start" | "battle_end",
    context?: { pokemonName?: string; isGoodPick?: boolean; winner?: string } | null,
    player?: string
  ) => {
    setIsAiThinking(true);
    try {
      const response = await fetch('/api/poke-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rivalName: rival,
          playerName: player || playerName,
          event,
          context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiCommentary(data.commentary);
        speak(data.commentary, { rate: 1.0, pitch: 0.9 });
      }
    } catch (error) {
      console.warn('AI commentary failed:', error);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Handle player pick
  const handlePlayerPick = (picked: Pokemon) => {
    playSound('click');

    const newPlayerTeam = [...playerTeam, picked];
    setPlayerTeam(newPlayerTeam);

    // Remove from pool
    const newPool = availablePool.filter(p => p.id !== picked.id);
    setAvailablePool(newPool);

    // Check if pick is "good" (high stats or fills a role)
    const rolesFilled = checkRoleRequirements(playerTeam);
    const pickRole = getBestRole(picked);
    const isGoodPick =
      (picked.hp + picked.attack + picked.defense + picked.special_attack + picked.special_defense + picked.speed >= 500) ||
      (!rolesFilled.tank && pickRole === "tank") ||
      (!rolesFilled.sweeper && pickRole === "sweeper") ||
      (!rolesFilled.support && pickRole === "support") ||
      picked.is_legendary ||
      picked.is_mythical;

    if (isGoodPick) {
      playSound('powerup');
    }

    // AI reacts to player pick
    fetchAiCommentary(rivalName, "player_pick", { pokemonName: picked.name, isGoodPick });

    // Check if drafting is complete
    if (newPlayerTeam.length >= 6 && rivalTeam.length >= 6) {
      setTimeout(() => startBattle(newPlayerTeam, rivalTeam), 2000);
      return;
    }

    // AI's turn next
    setIsPlayerTurn(false);
    setPickNumber(prev => prev + 1);

    // Generate AI choices and make pick after a delay
    setTimeout(() => {
      const aiChoices = generateChoices(newPool, newPlayerTeam, rivalTeam, false);
      if (aiChoices.length > 0) {
        const aiPick = makeAIPick(aiChoices, rivalTeam, newPlayerTeam);
        handleAIPick(aiPick, newPool, newPlayerTeam);
      }
    }, 1500);
  };

  // Handle AI pick
  const handleAIPick = (picked: Pokemon, pool: Pokemon[], pTeam: DraftedPokemon[]) => {
    playSound('select');

    const newRivalTeam = [...rivalTeam, picked];
    setRivalTeam(newRivalTeam);

    // Remove from pool
    const newPool = pool.filter(p => p.id !== picked.id);
    setAvailablePool(newPool);

    // AI commentary about their pick
    fetchAiCommentary(rivalName, "rival_pick", { pokemonName: picked.name });

    // Check if drafting is complete
    if (pTeam.length >= 6 && newRivalTeam.length >= 6) {
      setTimeout(() => startBattle(pTeam, newRivalTeam), 2000);
      return;
    }

    // Player's turn
    setIsPlayerTurn(true);
    setPickNumber(prev => prev + 1);

    // Generate new choices for player
    const newChoices = generateChoices(newPool, pTeam, newRivalTeam, true);
    setCurrentChoices(newChoices);
  };

  // Start battle phase
  const startBattle = (pTeam: DraftedPokemon[], rTeam: DraftedPokemon[]) => {
    setPhase("battle");
    playSound('powerup');

    fetchAiCommentary(rivalName, "battle_start");
    speak("The battle begins!");

    // Simulate battle
    const result = simulateBattle(pTeam, rTeam);
    setBattleResult(result);

    // Generate battle narration
    fetchBattleNarration(pTeam, rTeam, result);
  };

  // Fetch battle narration from AI
  const fetchBattleNarration = async (
    pTeam: DraftedPokemon[],
    rTeam: DraftedPokemon[],
    result: { winner: string; score1: number; score2: number; highlights: string[] }
  ) => {
    try {
      const response = await fetch('/api/poke-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rivalName,
          playerName,
          event: "battle_narration",
          context: {
            playerTeam: pTeam.map(p => p.name),
            rivalTeam: rTeam.map(p => p.name),
            winner: result.winner === "player" ? playerName : rivalName,
            highlights: result.highlights,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBattleNarration(data.narration || result.highlights);
        animateNarration(data.narration || result.highlights);
      } else {
        setBattleNarration(result.highlights);
        animateNarration(result.highlights);
      }
    } catch (error) {
      console.warn('Battle narration failed:', error);
      setBattleNarration(result.highlights);
      animateNarration(result.highlights);
    }
  };

  // Animate narration display
  const animateNarration = (narration: string[]) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < narration.length) {
        setCurrentNarrationIndex(index);
        speak(narration[index], { rate: 1.1 });
        index++;
      } else {
        clearInterval(interval);
        // Show results after narration
        setTimeout(() => {
          setPhase("results");
          if (battleResult) {
            if (battleResult.winner === "player") {
              playSound('win');
              fetchAiCommentary(rivalName, "battle_end", { winner: playerName });
            } else {
              playSound('lose');
              fetchAiCommentary(rivalName, "battle_end", { winner: rivalName });
            }
          }
        }, 2000);
      }
    }, 3000);
  };

  // Get role display
  const getRoleDisplay = (p: Pokemon): { label: string; color: string } => {
    const role = getBestRole(p);
    switch (role) {
      case "tank": return { label: "Tank", color: "bg-blue-500" };
      case "sweeper": return { label: "Sweeper", color: "bg-red-500" };
      case "support": return { label: "Support", color: "bg-green-500" };
    }
  };

  // Intro screen
  if (phase === "intro") {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
          PokeDraft: Build the Best Team
        </h1>
        <p className="text-center text-xl text-gray-600 mb-8">
          Draft a team of 6 Pokemon and battle your AI rival!
        </p>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-center mb-6">
            Welcome, {playerName}!
          </h2>

          <div className="bg-yellow-50 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Draft Rules:</h3>
            <ul className="text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">1.</span>
                <span>Draft 6 Pokemon, alternating picks with your rival</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">2.</span>
                <span>No duplicate primary types on your team</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">3.</span>
                <span>Build a balanced team with different roles:</span>
              </li>
              <ul className="ml-8 space-y-1 text-sm">
                <li><span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs">Tank</span> - High HP + Defense</li>
                <li><span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Sweeper</span> - High Attack/Sp.Atk + Speed</li>
                <li><span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs">Support</span> - High Sp.Def + bulk</li>
              </ul>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">4.</span>
                <span>Teams auto-battle based on stats and type coverage</span>
              </li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-orange-500 text-white py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
          >
            Start Draft!
          </button>
        </div>
      </div>
    );
  }

  // Drafting phase
  if (phase === "drafting") {
    const playerRoles = checkRoleRequirements(playerTeam);
    const rivalRoles = checkRoleRequirements(rivalTeam);

    return (
      <div className="py-4">
        <h1 className="text-3xl font-bold text-center text-orange-600 mb-2">
          PokeDraft
        </h1>

        {/* Pick counter */}
        <div className="text-center mb-4">
          <span className="bg-white px-6 py-2 rounded-full shadow text-lg">
            Pick <span className="font-bold text-orange-600">{pickNumber}</span> / 12
          </span>
        </div>

        {/* AI Commentary */}
        {aiCommentary && (
          <div className="max-w-3xl mx-auto mb-4">
            <div className="bg-purple-100 rounded-2xl p-4 relative">
              <div className="absolute -top-2 left-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {rivalName}
              </div>
              <p className="text-lg text-purple-800 mt-2 italic">
                {isAiThinking ? "..." : `"${aiCommentary}"`}
              </p>
            </div>
          </div>
        )}

        {/* Draft boards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Player team */}
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <h3 className="text-xl font-bold text-center mb-2 text-blue-600">
              {playerName}&apos;s Team
            </h3>
            <div className="flex gap-1 justify-center mb-2">
              <span className={`text-xs px-2 py-0.5 rounded ${playerRoles.tank ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                Tank {playerRoles.tank ? '✓' : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${playerRoles.sweeper ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
                Sweeper {playerRoles.sweeper ? '✓' : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${playerRoles.support ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                Support {playerRoles.support ? '✓' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 ${
                  playerTeam[i] ? 'bg-blue-50' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                }`}>
                  {playerTeam[i] ? (
                    <>
                      <Image
                        src={playerTeam[i].image}
                        alt={playerTeam[i].name}
                        width={60}
                        height={60}
                      />
                      <span className="text-xs font-bold truncate w-full text-center">
                        {playerTeam[i].name}
                      </span>
                      <span className={`text-xs px-1 rounded ${getRoleDisplay(playerTeam[i]).color} text-white`}>
                        {getRoleDisplay(playerTeam[i]).label}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 text-2xl">?</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current choices */}
          <div className="bg-gradient-to-b from-yellow-50 to-orange-50 rounded-2xl p-4 shadow-lg border-2 border-orange-200">
            <h3 className="text-xl font-bold text-center mb-4">
              {isPlayerTurn ? "Your Pick!" : `${rivalName} is picking...`}
            </h3>

            {isPlayerTurn && currentChoices.length > 0 ? (
              <div className="space-y-3">
                {currentChoices.map((p) => {
                  const canPick = canDraft(playerTeam, p);
                  const role = getRoleDisplay(p);
                  const totalStats = p.hp + p.attack + p.defense + p.special_attack + p.special_defense + p.speed;

                  return (
                    <button
                      key={p.id}
                      onClick={() => canPick && handlePlayerPick(p)}
                      disabled={!canPick}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                        canPick
                          ? 'bg-white hover:bg-yellow-100 hover:scale-102 shadow-md cursor-pointer'
                          : 'bg-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={60}
                        height={60}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg">{p.name}</div>
                        <div className="flex gap-1 flex-wrap">
                          {p.types.map(t => (
                            <span key={t} className={`${getTypeColor(t)} text-white text-xs px-2 py-0.5 rounded capitalize`}>
                              {t}
                            </span>
                          ))}
                          <span className={`${role.color} text-white text-xs px-2 py-0.5 rounded`}>
                            {role.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          BST: {totalStats}
                          {(p.is_legendary || p.is_mythical) && (
                            <span className="ml-2 text-purple-600 font-bold">
                              {p.is_legendary ? 'Legendary' : 'Mythical'}
                            </span>
                          )}
                        </div>
                      </div>
                      {!canPick && (
                        <span className="text-xs text-red-500">Type taken</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="animate-pulse text-xl text-gray-500">
                  {rivalName} is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Rival team */}
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <h3 className="text-xl font-bold text-center mb-2 text-red-600">
              {rivalName}&apos;s Team
            </h3>
            <div className="flex gap-1 justify-center mb-2">
              <span className={`text-xs px-2 py-0.5 rounded ${rivalRoles.tank ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                Tank {rivalRoles.tank ? '✓' : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${rivalRoles.sweeper ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
                Sweeper {rivalRoles.sweeper ? '✓' : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${rivalRoles.support ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                Support {rivalRoles.support ? '✓' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 ${
                  rivalTeam[i] ? 'bg-red-50' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                }`}>
                  {rivalTeam[i] ? (
                    <>
                      <Image
                        src={rivalTeam[i].image}
                        alt={rivalTeam[i].name}
                        width={60}
                        height={60}
                      />
                      <span className="text-xs font-bold truncate w-full text-center">
                        {rivalTeam[i].name}
                      </span>
                      <span className={`text-xs px-1 rounded ${getRoleDisplay(rivalTeam[i]).color} text-white`}>
                        {getRoleDisplay(rivalTeam[i]).label}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 text-2xl">?</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Type legend */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-center text-sm text-gray-500 mb-2">Your team types:</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {getTeamTypes(playerTeam).map((t, i) => (
                <span key={i} className={`${getTypeColor(t)} text-white text-xs px-2 py-1 rounded capitalize`}>
                  {t}
                </span>
              ))}
              {playerTeam.length < 6 && (
                <span className="text-gray-400 text-xs">
                  {6 - playerTeam.length} more picks
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Battle phase
  if (phase === "battle") {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
          Battle!
        </h1>

        <div className="max-w-4xl mx-auto">
          {/* Battle animation area */}
          <div className="bg-gradient-to-b from-sky-200 to-green-200 rounded-3xl p-8 shadow-xl mb-6">
            {/* Teams face-off */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2">
                {playerTeam.slice(0, 3).map((p, i) => (
                  <div key={i} className="bg-white/80 rounded-xl p-2 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    <Image src={p.image} alt={p.name} width={60} height={60} />
                  </div>
                ))}
              </div>
              <div className="text-4xl font-bold text-white drop-shadow-lg">VS</div>
              <div className="flex gap-2">
                {rivalTeam.slice(0, 3).map((p, i) => (
                  <div key={i} className="bg-white/80 rounded-xl p-2 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    <Image src={p.image} alt={p.name} width={60} height={60} className="scale-x-[-1]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Battle narration */}
            <div className="bg-black/80 rounded-xl p-4 min-h-[100px]">
              {battleNarration[currentNarrationIndex] && (
                <p className="text-white text-xl text-center font-mono animate-pulse">
                  {battleNarration[currentNarrationIndex]}
                </p>
              )}
            </div>
          </div>

          {/* Team displays */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-100 rounded-2xl p-4">
              <h3 className="font-bold text-blue-800 mb-2">{playerName}&apos;s Team</h3>
              <div className="flex flex-wrap gap-1">
                {playerTeam.map((p, i) => (
                  <div key={i} className="bg-white rounded-lg p-1 flex items-center gap-1">
                    <Image src={p.image} alt={p.name} width={30} height={30} />
                    <span className="text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-100 rounded-2xl p-4">
              <h3 className="font-bold text-red-800 mb-2">{rivalName}&apos;s Team</h3>
              <div className="flex flex-wrap gap-1">
                {rivalTeam.map((p, i) => (
                  <div key={i} className="bg-white rounded-lg p-1 flex items-center gap-1">
                    <Image src={p.image} alt={p.name} width={30} height={30} />
                    <span className="text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results phase
  if (phase === "results" && battleResult) {
    const playerWon = battleResult.winner === "player";

    return (
      <div className="py-8">
        <h1 className={`text-4xl font-bold text-center mb-4 ${playerWon ? 'text-green-600' : 'text-red-600'}`}>
          {playerWon ? 'Victory!' : 'Defeat!'}
        </h1>

        <div className="max-w-3xl mx-auto">
          {/* Result card */}
          <div className={`rounded-3xl p-8 shadow-xl mb-6 ${playerWon ? 'bg-gradient-to-br from-green-100 to-yellow-100' : 'bg-gradient-to-br from-red-100 to-orange-100'}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{playerWon ? '🏆' : '💪'}</div>
              <h2 className="text-3xl font-bold">
                {playerWon ? `${playerName} wins!` : `${rivalName} wins!`}
              </h2>
            </div>

            {/* Score comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`bg-white rounded-2xl p-4 text-center ${playerWon ? 'ring-4 ring-green-400' : ''}`}>
                <h3 className="font-bold text-blue-600 mb-2">{playerName}</h3>
                <div className="text-4xl font-bold text-blue-800">{battleResult.score1}</div>
                <div className="text-sm text-gray-500">Battle Score</div>
              </div>
              <div className={`bg-white rounded-2xl p-4 text-center ${!playerWon ? 'ring-4 ring-red-400' : ''}`}>
                <h3 className="font-bold text-red-600 mb-2">{rivalName}</h3>
                <div className="text-4xl font-bold text-red-800">{battleResult.score2}</div>
                <div className="text-sm text-gray-500">Battle Score</div>
              </div>
            </div>

            {/* AI Commentary */}
            {aiCommentary && (
              <div className="bg-purple-100 rounded-2xl p-4 mb-6">
                <div className="font-bold text-purple-600 mb-1">{rivalName} says:</div>
                <p className="text-lg text-purple-800 italic">&quot;{aiCommentary}&quot;</p>
              </div>
            )}

            {/* Team summaries */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-bold mb-2">Your Team:</h4>
                <div className="flex flex-wrap gap-1">
                  {playerTeam.map((p, i) => (
                    <div key={i} className="bg-white rounded-lg p-1">
                      <Image src={p.image} alt={p.name} width={40} height={40} />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Types: {getTeamTypes(playerTeam).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                </div>
                <div className="text-sm text-gray-600">
                  Coverage: {getTypeCoverage(playerTeam)} types
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-2">{rivalName}&apos;s Team:</h4>
                <div className="flex flex-wrap gap-1">
                  {rivalTeam.map((p, i) => (
                    <div key={i} className="bg-white rounded-lg p-1">
                      <Image src={p.image} alt={p.name} width={40} height={40} />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Types: {getTeamTypes(rivalTeam).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                </div>
                <div className="text-sm text-gray-600">
                  Coverage: {getTypeCoverage(rivalTeam)} types
                </div>
              </div>
            </div>
          </div>

          {/* Play again */}
          <div className="text-center">
            <button
              onClick={startGame}
              className="bg-orange-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
            >
              Draft Again!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
