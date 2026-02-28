"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { pokemon as allPokemon, type Pokemon } from "@/data/pokemon";
import { usePlayer } from "@/lib/player";
import { playSound, preloadCommonSounds } from "@/lib/sounds";
import { speak, stopSpeaking } from "@/lib/speech";

// ─── Types ──────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard" | "expert";
type GamePhase = "start" | "loading" | "playing" | "result";

interface PlacedPokemon {
  id: number;
  name: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  flipped: boolean;
  zIndex: number;
  delay: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const DIFFICULTIES: Record<
  Difficulty,
  {
    countRange: [number, number];
    specificChance: number;
    label: string;
    emoji: string;
    bg: string;
    pointsBase: number;
  }
> = {
  easy: {
    countRange: [10, 18],
    specificChance: 0,
    label: "Easy",
    emoji: "🌱",
    bg: "from-green-400 to-emerald-500",
    pointsBase: 10,
  },
  medium: {
    countRange: [16, 28],
    specificChance: 0.2,
    label: "Medium",
    emoji: "🌿",
    bg: "from-yellow-400 to-amber-500",
    pointsBase: 20,
  },
  hard: {
    countRange: [24, 42],
    specificChance: 0.45,
    label: "Hard",
    emoji: "🔥",
    bg: "from-orange-400 to-red-500",
    pointsBase: 30,
  },
  expert: {
    countRange: [36, 60],
    specificChance: 0.65,
    label: "Expert",
    emoji: "💎",
    bg: "from-purple-500 to-indigo-600",
    pointsBase: 50,
  },
};

const BUTTON_STYLES = [
  "from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 ring-blue-300",
  "from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 ring-emerald-300",
  "from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 ring-orange-300",
  "from-fuchsia-400 to-fuchsia-600 hover:from-fuchsia-500 hover:to-fuchsia-700 ring-fuchsia-300",
];

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "expert"];

// ─── Helpers ────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function generateChoices(correct: number): number[] {
  const choices = new Set<number>([correct]);
  const spread = correct <= 15 ? 3 : correct <= 30 ? 5 : 8;

  let attempts = 0;
  while (choices.size < 4 && attempts < 200) {
    const offset = randomInt(1, spread) * (Math.random() > 0.5 ? 1 : -1);
    const val = correct + offset;
    if (val > 0 && !choices.has(val)) {
      choices.add(val);
    }
    attempts++;
  }
  while (choices.size < 4) {
    choices.add(correct + choices.size * 2);
  }
  return shuffle(Array.from(choices));
}

function generatePlacements(count: number): Omit<PlacedPokemon, "id" | "name">[] {
  // Use fewer columns so Pokemon cluster tighter together
  const aspectRatio = 16 / 10;
  const rawCols = Math.sqrt(count * aspectRatio);
  const cols = Math.max(2, Math.ceil(rawCols * 0.8));
  const rows = Math.ceil(count / cols);

  const cellW = 100 / cols;
  const cellH = 100 / rows;

  // Bigger sizes across all counts
  const maxSize = count <= 18 ? 110 : count <= 30 ? 92 : count <= 45 ? 76 : 64;
  const minSize = count <= 18 ? 80 : count <= 30 ? 66 : count <= 45 ? 52 : 44;

  const placements: Omit<PlacedPokemon, "id" | "name">[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Tighter jitter so they group more closely
    const jitterX = (Math.random() - 0.5) * cellW * 0.4;
    const jitterY = (Math.random() - 0.5) * cellH * 0.4;

    const x = Math.max(5, Math.min(95, (col + 0.5) * cellW + jitterX));
    const y = Math.max(5, Math.min(95, (row + 0.5) * cellH + jitterY));

    placements.push({
      x,
      y,
      size: randomInt(minSize, maxSize),
      rotation: (Math.random() - 0.5) * 20,
      flipped: Math.random() > 0.5,
      zIndex: randomInt(1, 10),
      delay: Math.random() * 0.6,
    });
  }

  return shuffle(placements);
}

function computeNextDifficulty(
  current: Difficulty,
  consecutiveCorrect: number,
  lastWasCorrect: boolean
): Difficulty {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  if (lastWasCorrect && consecutiveCorrect >= 2 && idx < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[idx + 1];
  }
  if (!lastWasCorrect && idx > 0) {
    return DIFFICULTY_ORDER[idx - 1];
  }
  return current;
}

// ─── API Calls ──────────────────────────────────────────────────────

async function aiQuestion(data: {
  pokemonName?: string;
  isSpecificPokemon: boolean;
  difficulty: string;
  playerName: string;
  round: number;
}): Promise<string> {
  const res = await fetch("/api/pokemon-count", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "question", data }),
  });
  if (!res.ok) throw new Error("AI question failed");
  return (await res.json()).text;
}

async function aiCompliment(data: {
  playerName: string;
  pokemonName: string;
  isCorrect: boolean;
  timeTaken: number;
  count: number;
  isSpecificPokemon: boolean;
  streak: number;
  round: number;
  difficulty: string;
}): Promise<string> {
  const res = await fetch("/api/pokemon-count", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "compliment", data }),
  });
  if (!res.ok) throw new Error("AI compliment failed");
  return (await res.json()).text;
}

async function aiWelcome(playerName: string): Promise<string> {
  const res = await fetch("/api/pokemon-count", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "welcome", data: { playerName } }),
  });
  if (!res.ok) throw new Error("AI welcome failed");
  return (await res.json()).text;
}

// ─── Component ──────────────────────────────────────────────────────

export default function PokemonCountPage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [phase, setPhase] = useState<GamePhase>("start");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  // Round state
  const [placed, setPlaced] = useState<PlacedPokemon[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [isSpecificMode, setIsSpecificMode] = useState(false);
  const [targetPokemon, setTargetPokemon] = useState<Pokemon | null>(null);

  // Timer (counts UP — no timeout, kid can't lose)
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartRef = useRef(0);

  // Bonus round (every 3rd round, one Pokemon moves)
  const [isBonusRound, setIsBonusRound] = useState(false);
  const [moverIndex, setMoverIndex] = useState(-1);
  const [moverPos, setMoverPos] = useState({ x: 50, y: 50 });
  const moverRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Result
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [timeTaken, setTimeTaken] = useState(0);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  // Welcome
  const [welcomeText, setWelcomeText] = useState("");
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false);

  // Refs for cleanup
  const abortRef = useRef<AbortController | null>(null);

  // Preload sounds on mount
  useEffect(() => {
    preloadCommonSounds();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moverRef.current) clearInterval(moverRef.current);
      stopSpeaking();
      abortRef.current?.abort();
    };
  }, []);

  // Bonus round mover animation
  useEffect(() => {
    if (isBonusRound && phase === "playing" && moverIndex >= 0) {
      // Pick a random destination and drift there smoothly
      const move = () => {
        setMoverPos({
          x: 8 + Math.random() * 84,
          y: 8 + Math.random() * 84,
        });
      };
      move(); // Initial position
      moverRef.current = setInterval(move, 2000);
      return () => {
        if (moverRef.current) clearInterval(moverRef.current);
      };
    }
  }, [isBonusRound, phase, moverIndex]);

  // ─── Welcome message ─────────────────────────────────────────────

  useEffect(() => {
    if (phase === "start" && playerName && !welcomeText && !isLoadingWelcome) {
      setIsLoadingWelcome(true);
      aiWelcome(playerName)
        .then((text) => {
          setWelcomeText(text);
          speak(text, { rate: 0.95, pitch: 1.1 });
        })
        .catch(() => {})
        .finally(() => setIsLoadingWelcome(false));
    }
  }, [phase, playerName, welcomeText, isLoadingWelcome]);

  // ─── Timer logic (counts UP — no timeout) ────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    roundStartRef.current = Date.now();
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - roundStartRef.current) / 1000));
    }, 250);
  }, [stopTimer]);

  // ─── Start new round ─────────────────────────────────────────────

  const startNewRound = useCallback(
    async (nextDifficulty: Difficulty, nextRound: number) => {
      stopSpeaking();
      stopTimer();
      setPhase("loading");
      setSelectedAnswer(null);
      setIsCorrect(false);
      setResultMessage("");
      setIsLoadingMessage(false);

      const settings = DIFFICULTIES[nextDifficulty];
      const count = randomInt(settings.countRange[0], settings.countRange[1]);
      const isSpecific = Math.random() < settings.specificChance;

      let answer: number;
      let target: Pokemon | null = null;
      const layouts = generatePlacements(count);
      const finalPlacements: PlacedPokemon[] = [];

      if (isSpecific) {
        // Pick a target Pokemon and several other species
        target = allPokemon[randomInt(0, allPokemon.length - 1)];
        const targetCount = Math.max(3, Math.floor(count * (0.25 + Math.random() * 0.3)));
        answer = targetCount;

        const otherSpecies = pickRandom(
          allPokemon.filter((p) => p.id !== target!.id),
          randomInt(4, 8)
        );

        for (let i = 0; i < count; i++) {
          const poke =
            i < targetCount
              ? target
              : otherSpecies[randomInt(0, otherSpecies.length - 1)];
          finalPlacements.push({
            ...layouts[i],
            id: poke.id,
            name: poke.name,
          });
        }
      } else {
        // Count-all mode: use varied random species
        answer = count;
        const species = pickRandom(allPokemon, randomInt(6, 12));

        for (let i = 0; i < count; i++) {
          const poke = species[randomInt(0, species.length - 1)];
          finalPlacements.push({
            ...layouts[i],
            id: poke.id,
            name: poke.name,
          });
        }
      }

      const shuffledPlacements = shuffle(finalPlacements);

      // Every 3rd round is a bonus round with a moving Pokemon
      const bonus = nextRound > 0 && nextRound % 3 === 0;
      setIsBonusRound(bonus);
      setMoverIndex(bonus ? randomInt(0, shuffledPlacements.length - 1) : -1);
      setMoverPos({ x: 50, y: 50 });
      if (moverRef.current) clearInterval(moverRef.current);

      setDifficulty(nextDifficulty);
      setRound(nextRound);
      setIsSpecificMode(isSpecific);
      setTargetPokemon(target);
      setCorrectAnswer(answer);
      setChoices(generateChoices(answer));
      setPlaced(shuffledPlacements);
      // Generate AI question
      try {
        const question = await aiQuestion({
          pokemonName: target?.name,
          isSpecificPokemon: isSpecific,
          difficulty: nextDifficulty,
          playerName,
          round: nextRound,
        });
        setQuestionText(question);

        playSound("whoosh", { volume: 0.4 });
        setPhase("playing");
        startTimer();

        setTimeout(() => {
          speak(question, { rate: 0.92, pitch: 1.1 });
        }, 250);
      } catch {
        // Dynamic fallback (never preset — constructed from game state)
        const fallback = isSpecific
          ? `How many ${target?.name} can you count on the screen?`
          : `How many Pokemon can you count on the screen?`;
        setQuestionText(fallback);
        playSound("whoosh", { volume: 0.4 });
        setPhase("playing");
        startTimer();
        speak(fallback, { rate: 0.92, pitch: 1.1 });
      }
    },
    [playerName, startTimer, stopTimer]
  );

  // ─── Handle answer ───────────────────────────────────────────────

  const handleAnswer = useCallback(
    async (chosen: number) => {
      if (phase !== "playing" || selectedAnswer !== null) return;

      stopTimer();
      stopSpeaking();
      if (moverRef.current) clearInterval(moverRef.current);
      const finalElapsed = Math.max(1, Math.round((Date.now() - roundStartRef.current) / 1000));
      setTimeTaken(finalElapsed);
      setSelectedAnswer(chosen);

      const correct = chosen === correctAnswer;
      setIsCorrect(correct);

      const newStreak = correct ? streak + 1 : 0;

      if (correct) {
        setStreak(newStreak);
        const bonus = newStreak > 1 ? (newStreak - 1) * 5 : 0;
        setScore((prev) => prev + DIFFICULTIES[difficulty].pointsBase + bonus);

        if (newStreak >= 3) {
          playSound("combo", { rate: 1 + newStreak * 0.05, volume: 0.7 });
        } else {
          playSound("success", { volume: 0.7 });
        }
        setTimeout(() => playSound("coin", { volume: 0.5 }), 300);
      } else {
        setStreak(0);
        playSound("pop", { volume: 0.5 });
      }

      setPhase("result");
      setIsLoadingMessage(true);

      try {
        const msg = await aiCompliment({
          playerName,
          pokemonName: isSpecificMode
            ? targetPokemon?.name || "Pokemon"
            : "Pokemon",
          isCorrect: correct,
          timeTaken: finalElapsed,
          count: correctAnswer,
          isSpecificPokemon: isSpecificMode,
          streak: correct ? newStreak : 0,
          round,
          difficulty,
        });
        setResultMessage(msg);
        speak(msg, {
          rate: correct ? 1.0 : 0.9,
          pitch: correct ? 1.15 : 1.0,
        });
      } catch {
        const fallback = correct
          ? `${playerName}, you counted ${correctAnswer} ${isSpecificMode ? targetPokemon?.name || "Pokemon" : "Pokemon"} in ${finalElapsed} seconds!`
          : `The answer was ${correctAnswer}, ${playerName}. You spent ${finalElapsed} seconds counting. Keep going!`;
        setResultMessage(fallback);
        speak(fallback, { rate: 0.9, pitch: 1.05 });
      } finally {
        setIsLoadingMessage(false);
      }
    },
    [
      phase,
      selectedAnswer,
      correctAnswer,
      streak,
      difficulty,
      playerName,
      isSpecificMode,
      targetPokemon,
      round,
      stopTimer,
    ]
  );

  // ─── Next round ──────────────────────────────────────────────────

  const handleNextRound = useCallback(() => {
    stopSpeaking();
    const nextDiff = computeNextDifficulty(difficulty, streak, isCorrect);
    startNewRound(nextDiff, round + 1);
  }, [difficulty, streak, isCorrect, round, startNewRound]);

  // ─── Start game ──────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    stopSpeaking();
    setScore(0);
    setStreak(0);
    playSound("powerup", { volume: 0.6 });
    startNewRound("easy", 1);
  }, [startNewRound]);

  // ─── Timer display helpers ───────────────────────────────────────

  const timerColor = "text-sky-300";

  // ─── Render: Start Screen ────────────────────────────────────────

  if (phase === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-6">
            <div className="flex justify-center gap-2 mb-4">
              {[25, 1, 4, 7, 133, 39].map((id) => (
                <div
                  key={id}
                  className="animate-bounce"
                  style={{ animationDelay: `${id * 0.05}s` }}
                >
                  <Image
                    src={`/pokemon/${id}.png`}
                    alt=""
                    width={52}
                    height={52}
                    className="drop-shadow-lg"
                  />
                </div>
              ))}
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-lg mb-2">
              Pokemon Count!
            </h1>
            <p className="text-xl text-white/90 font-medium">
              A counting adventure for trainers!
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-6 mb-6">
            {welcomeText ? (
              <p className="text-lg text-white font-medium leading-relaxed">
                {welcomeText}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-lg text-white/80">
                  Professor is getting ready...
                </p>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-8 text-left text-white/90 space-y-2">
            <p className="font-semibold text-white text-center mb-3 text-lg">
              How to Play
            </p>
            <p>
              Count all the Pokemon on the screen and pick the right
              number!
            </p>
            <p>
              Sometimes you&apos;ll need to count only one specific Pokemon
              among many.
            </p>
            <p>
              Difficulty adapts as you play — get answers right to level
              up!
            </p>
          </div>

          <button
            onClick={handleStartGame}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-14 py-5 rounded-full font-black text-3xl
                       hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-110 active:scale-95
                       shadow-2xl shadow-orange-500/40"
          >
            START!
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Loading Screen ──────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 via-cyan-400 to-teal-400 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="flex justify-center gap-3 mb-6">
            {[randomInt(1, 151), randomInt(1, 151), randomInt(1, 151)].map(
              (id, i) => (
                <div
                  key={i}
                  className="animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <Image
                    src={`/pokemon/${id}.png`}
                    alt=""
                    width={64}
                    height={64}
                    className="drop-shadow-lg"
                  />
                </div>
              )
            )}
          </div>
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl font-bold text-white drop-shadow">
            Getting Pokemon ready...
          </p>
          <p className="text-white/80 mt-2">Round {round > 0 ? round : 1}</p>
        </div>
      </div>
    );
  }

  // ─── Render: Playing + Result (shared layout) ────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100">
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-white/40 px-3 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-2 flex-wrap">
          {/* Left: back + round */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 font-bold text-lg"
            >
              ← Home
            </Link>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-gray-600">
              Round {round}
            </span>
            <span
              className={`bg-gradient-to-r ${DIFFICULTIES[difficulty].bg} text-white px-3 py-1 rounded-full text-sm font-bold`}
            >
              {DIFFICULTIES[difficulty].emoji} {DIFFICULTIES[difficulty].label}
            </span>
          </div>

          {/* Center: score + streak */}
          <div className="flex items-center gap-3">
            <span className="bg-yellow-100 px-3 py-1 rounded-full text-sm font-bold text-yellow-700">
              Score: {score}
            </span>
            {streak > 0 && (
              <span className="bg-orange-100 px-3 py-1 rounded-full text-sm font-bold text-orange-600">
                Streak: {streak} 🔥
              </span>
            )}
            {isBonusRound && (
              <span className="bg-purple-100 px-3 py-1 rounded-full text-sm font-bold text-purple-600 animate-pulse">
                BONUS ROUND ⭐
              </span>
            )}
          </div>

          {/* Right: timer */}
          <div
            className={`bg-gray-900 px-4 py-1.5 rounded-full font-mono font-black text-xl ${timerColor}`}
          >
            {elapsed}s
          </div>
        </div>
      </div>

      {/* ── Question Bar ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          {isSpecificMode && targetPokemon && (
            <div className="flex-shrink-0 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-2xl p-2 shadow-xl border-3 border-amber-400 ring-4 ring-amber-300/50">
              <Image
                src={`/pokemon/${targetPokemon.id}.png`}
                alt={targetPokemon.name}
                width={72}
                height={72}
                className="drop-shadow-lg"
              />
              <p className="text-center text-xs font-black text-amber-700 mt-0.5">
                {targetPokemon.name}
              </p>
            </div>
          )}
          <div
            className={`bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg text-center ${
              isSpecificMode ? "border-2 border-amber-400" : ""
            }`}
          >
            <p className="text-lg md:text-xl font-bold text-gray-800 leading-snug">
              {questionText}
            </p>
            {isSpecificMode && targetPokemon && (
              <p className="text-base font-black text-amber-600 mt-1">
                Count only {targetPokemon.name}!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Pokemon Arena ────────────────────────────────────────── */}
      <div className="flex-1 relative mx-2 my-1 rounded-3xl bg-white/60 backdrop-blur-sm border-2 border-white/70 shadow-inner overflow-hidden">
        {placed.map((p, i) => {
          const isTarget = isSpecificMode && targetPokemon && p.id === targetPokemon.id;
          const isDistractor = isSpecificMode && targetPokemon && p.id !== targetPokemon.id;
          const isMover = isBonusRound && i === moverIndex;
          // In specific mode: targets are 40% larger, distractors are 25% smaller
          const displaySize = isTarget
            ? Math.round(p.size * 1.4)
            : isDistractor
              ? Math.round(p.size * 0.75)
              : p.size;

          // Mover overrides position
          const posX = isMover ? moverPos.x : p.x;
          const posY = isMover ? moverPos.y : p.y;

          return (
            <div
              key={`${i}-${p.id}`}
              className={`absolute animate-fade-scale-in group/poke ${isDistractor ? "opacity-50" : ""}`}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                width: displaySize,
                height: displaySize,
                transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scaleX(${p.flipped ? -1 : 1})`,
                zIndex: isMover ? 20 : isTarget ? 15 : p.zIndex,
                animationDelay: `${p.delay}s`,
                filter: isDistractor ? "grayscale(0.4)" : undefined,
                transition: isMover ? "left 2s ease-in-out, top 2s ease-in-out" : undefined,
              }}
            >
              <Image
                src={`/pokemon/${p.id}.png`}
                alt={p.name}
                width={displaySize}
                height={displaySize}
                className={`select-none w-full h-full object-contain ${
                  isTarget
                    ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                    : isMover
                      ? "drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                      : "drop-shadow-md"
                }`}
                draggable={false}
              />
              <span
                className="pointer-events-none absolute left-1/2 -bottom-1 opacity-0 group-hover/poke:opacity-100
                           transition-opacity bg-gray-900/80 text-white text-xs font-bold px-2 py-0.5 rounded-full
                           whitespace-nowrap -translate-x-1/2"
                style={{ transform: `translateX(-50%) scaleX(${p.flipped ? -1 : 1})` }}
              >
                {p.name}
              </span>
            </div>
          );
        })}

        {/* Result overlay */}
        {phase === "result" && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div
              className={`bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-lg w-full text-center transform transition-all ${
                isCorrect ? "ring-4 ring-green-400" : "ring-4 ring-orange-400"
              }`}
            >
              {/* Header */}
              <div className="mb-3">
                {isCorrect ? (
                  <>
                    <div className="text-5xl mb-1 animate-bounce">🎉</div>
                    <h2 className="text-3xl font-black text-green-600">
                      Correct!
                    </h2>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-1">💪</div>
                    <h2 className="text-3xl font-black text-orange-500">
                      So Close!
                    </h2>
                  </>
                )}
              </div>

              {/* Answer info */}
              <div className="bg-gray-50 rounded-2xl p-3 mb-3 space-y-1">
                {selectedAnswer !== null && (
                  <p className="text-gray-600">
                    You guessed:{" "}
                    <span
                      className={`font-black text-xl ${
                        isCorrect ? "text-green-600" : "text-orange-500"
                      }`}
                    >
                      {selectedAnswer}
                    </span>
                  </p>
                )}
                <p className="text-gray-600">
                  The answer:{" "}
                  <span className="font-black text-xl text-indigo-600">
                    {correctAnswer}
                  </span>{" "}
                  {isSpecificMode ? targetPokemon?.name : "Pokemon"}
                </p>
                <p className="text-gray-500 text-sm">
                  Time: <span className="font-bold">{timeTaken}s</span>
                </p>
              </div>

              {/* AI message */}
              <div className="bg-indigo-50 rounded-2xl p-4 mb-4 min-h-[60px] flex items-center justify-center">
                {isLoadingMessage ? (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">
                      Professor is thinking...
                    </span>
                  </div>
                ) : (
                  <p className="text-indigo-800 font-medium leading-relaxed">
                    {resultMessage}
                  </p>
                )}
              </div>

              {/* Score earned */}
              {isCorrect && (
                <p className="text-green-600 font-bold mb-3">
                  +{DIFFICULTIES[difficulty].pointsBase + (streak > 1 ? (streak - 1) * 5 : 0)} points
                  {streak > 1 && (
                    <span className="text-orange-500 ml-1">
                      (streak bonus!)
                    </span>
                  )}
                </p>
              )}

              {/* Next round button */}
              <button
                onClick={handleNextRound}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-10 py-3.5 rounded-full
                           font-black text-xl hover:from-indigo-600 hover:to-purple-700
                           transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Next Round →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Answer Buttons ───────────────────────────────────────── */}
      {phase === "playing" && (
        <div className="flex-shrink-0 px-3 py-2">
          <div className="grid grid-cols-4 gap-2 md:gap-3 max-w-3xl mx-auto">
            {choices.map((num, i) => (
              <button
                key={num}
                onClick={() => handleAnswer(num)}
                disabled={selectedAnswer !== null}
                className={`bg-gradient-to-b ${BUTTON_STYLES[i]} text-white rounded-2xl py-4 md:py-5
                            font-black text-3xl md:text-4xl shadow-lg
                            transition-all transform hover:scale-105 active:scale-95
                            ring-0 hover:ring-4 disabled:opacity-60 disabled:hover:scale-100`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hide buttons during result but keep space for layout */}
      {phase === "result" && (
        <div className="flex-shrink-0 px-3 py-2">
          <div className="grid grid-cols-4 gap-2 md:gap-3 max-w-3xl mx-auto">
            {choices.map((num, i) => (
              <div
                key={num}
                className={`bg-gradient-to-b ${BUTTON_STYLES[i]} rounded-2xl py-4 md:py-5 text-center
                            font-black text-3xl md:text-4xl shadow-lg
                            ${num === correctAnswer ? "ring-4 ring-white scale-105" : "opacity-40"} text-white`}
              >
                {num}
                {num === correctAnswer && (
                  <span className="block text-xs font-bold mt-0.5">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
