"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Level configuration: grid sizes and time limits
const LEVEL_CONFIG = [
  { gridSize: 3, timeLimit: 12, label: "3x3" },
  { gridSize: 4, timeLimit: 11, label: "4x4" },
  { gridSize: 5, timeLimit: 10, label: "5x5" },
  { gridSize: 6, timeLimit: 9, label: "6x6" },
  { gridSize: 7, timeLimit: 8, label: "7x7" },
  { gridSize: 8, timeLimit: 7, label: "8x8" },
];

type GamePhase = "idle" | "preview" | "hunting" | "success" | "failure" | "gameover";

// Get similar Pokemon (same type or color for harder decoys)
function getSimilarPokemon(target: Pokemon, count: number, level: number): Pokemon[] {
  const candidates: Pokemon[] = [];

  // For higher levels, prioritize same-type Pokemon
  if (level >= 2) {
    const sameType = pokemon.filter(
      (p) => p.id !== target.id && p.types.some((t) => target.types.includes(t))
    );
    candidates.push(...sameType);
  }

  // Add same-color Pokemon for medium+ levels
  if (level >= 1 && target.color) {
    const sameColor = pokemon.filter(
      (p) => p.id !== target.id && p.color === target.color && !candidates.includes(p)
    );
    candidates.push(...sameColor);
  }

  // Add same-shape Pokemon for harder levels
  if (level >= 3 && target.shape) {
    const sameShape = pokemon.filter(
      (p) => p.id !== target.id && p.shape === target.shape && !candidates.includes(p)
    );
    candidates.push(...sameShape);
  }

  // Fill remaining with random Pokemon
  const remaining = pokemon.filter(
    (p) => p.id !== target.id && !candidates.includes(p)
  );
  candidates.push(...remaining);

  // Shuffle and return
  return candidates.sort(() => Math.random() - 0.5).slice(0, count);
}

// Preload images for smooth gameplay
function preloadImages(pokemons: Pokemon[]): Promise<void[]> {
  return Promise.all(
    pokemons.map(
      (p) =>
        new Promise<void>((resolve) => {
          const img = document.createElement("img");
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = p.image;
        })
    )
  );
}

export default function DexSniperPage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  // Round state
  const [target, setTarget] = useState<Pokemon | null>(null);
  const [gridPokemon, setGridPokemon] = useState<Pokemon[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [maxTime, setMaxTime] = useState(0);

  // UI state
  const [clickedId, setClickedId] = useState<number | null>(null);
  const [showSparkles, setShowSparkles] = useState<number | null>(null);
  const [personalizedMessage, setPersonalizedMessage] = useState<{ message: string; emoji: string } | null>(null);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dex_sniper_high_score");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("dex_sniper_high_score", score.toString());
    }
  }, [score, highScore]);

  // Timer effect
  useEffect(() => {
    if (gamePhase === "hunting" && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((t) => Math.max(0, t - 0.05));
      }, 50);
    } else if (gamePhase === "hunting" && timeRemaining <= 0) {
      // Time's up!
      handleFailure();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gamePhase, timeRemaining]);

  const handleFailure = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    playSound("error");
    speak("Time's up!");
    setStreak(0);
    setLives((l) => l - 1);

    if (lives <= 1) {
      setGamePhase("gameover");
      playSound("lose");
      speak(`Game over ${playerName}! Your final score is ${score}.`);
    } else {
      setGamePhase("failure");
      const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setPersonalizedMessage(msg);
    }
  }, [lives, playerName, score]);

  const startNewRound = useCallback(async () => {
    const config = LEVEL_CONFIG[Math.min(level, LEVEL_CONFIG.length - 1)];
    const gridCount = config.gridSize * config.gridSize;

    // Select target
    const newTarget = pokemon[Math.floor(Math.random() * pokemon.length)];

    // Get decoys (similar Pokemon for harder levels)
    const decoys = getSimilarPokemon(newTarget, gridCount - 1, level);

    // Create grid with target at random position
    const grid = [...decoys];
    const targetPosition = Math.floor(Math.random() * gridCount);
    grid.splice(targetPosition, 0, newTarget);

    // Preload images
    await preloadImages([newTarget, ...decoys]);

    setTarget(newTarget);
    setGridPokemon(grid);
    setTimeRemaining(config.timeLimit);
    setMaxTime(config.timeLimit);
    setClickedId(null);
    setShowSparkles(null);
    setPersonalizedMessage(null);

    // Start preview phase
    setGamePhase("preview");
    playSound("whoosh");
    speak(`Find ${newTarget.name}!`);

    // After preview, start hunting
    previewTimerRef.current = setTimeout(() => {
      setGamePhase("hunting");
      playSound("countdown");
    }, 1500);
  }, [level]);

  const startGame = useCallback(() => {
    setLevel(0);
    setScore(0);
    setStreak(0);
    setLives(3);
    setGamePhase("idle");

    // Small delay then start first round
    setTimeout(() => {
      startNewRound();
    }, 100);
  }, [startNewRound]);

  const handlePokemonClick = useCallback(
    (clickedPokemon: Pokemon) => {
      if (gamePhase !== "hunting" || !target) return;

      // Stop timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setClickedId(clickedPokemon.id);

      if (clickedPokemon.id === target.id) {
        // Correct!
        const timeBonus = Math.floor(timeRemaining * 10);
        const streakBonus = streak * 5;
        const levelBonus = (level + 1) * 10;
        const roundScore = 50 + timeBonus + streakBonus + levelBonus;

        setScore((s) => s + roundScore);
        setStreak((s) => s + 1);
        setShowSparkles(clickedPokemon.id);

        playSound("success");
        speak("Got it!");

        const newStreak = streak + 1;

        // Check for level up (every 3 correct answers, max level)
        if (newStreak % 3 === 0 && level < LEVEL_CONFIG.length - 1) {
          setLevel((l) => l + 1);
          playSound("powerup");
          setTimeout(() => {
            speak(`Level up! ${playerName} is doing great!`);
          }, 300);
          const msg = getQuickPersonalizedMessage(playerName, "level_up");
          setPersonalizedMessage(msg);
        } else if (newStreak >= 5) {
          const msg = getQuickPersonalizedMessage(playerName, "streak", { streak: newStreak });
          setPersonalizedMessage(msg);
        } else {
          const msg = getQuickPersonalizedMessage(playerName, "correct_answer");
          setPersonalizedMessage(msg);
        }

        setGamePhase("success");

        // Continue to next round
        setTimeout(() => {
          startNewRound();
        }, 1200);
      } else {
        // Wrong!
        playSound("error");
        speak("Oops! Wrong Pokemon!");
        setStreak(0);
        setLives((l) => l - 1);

        if (lives <= 1) {
          setGamePhase("gameover");
          playSound("lose");
          setTimeout(() => {
            speak(`Game over ${playerName}! Your final score is ${score}.`);
          }, 500);
        } else {
          setGamePhase("failure");
          const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
          setPersonalizedMessage(msg);

          // Continue to next round
          setTimeout(() => {
            startNewRound();
          }, 1500);
        }
      }
    },
    [gamePhase, target, timeRemaining, streak, level, lives, score, playerName, startNewRound]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const config = LEVEL_CONFIG[Math.min(level, LEVEL_CONFIG.length - 1)];
  const timerPercent = maxTime > 0 ? (timeRemaining / maxTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? "bg-green-500" : timerPercent > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="py-8 min-h-screen">
      {/* Header */}
      <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">
        Dex Sniper
      </h1>
      <p className="text-center text-gray-600 mb-4">Find the Target Pokemon!</p>

      {/* Player & Stats */}
      <div className="flex justify-center gap-4 flex-wrap mb-6">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg font-semibold text-yellow-800 shadow">
          {playerName}
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Score: <span className="font-bold text-blue-600">{score}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Streak: <span className="font-bold text-orange-500">{streak}</span> 🔥
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Level: <span className="font-bold text-purple-600">{level + 1}</span> ({config.label})
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Lives: <span className="font-bold text-red-500">{"❤️".repeat(lives)}</span>
        </span>
        <span className="bg-purple-100 px-4 py-2 rounded-full shadow">
          Best: <span className="font-bold text-purple-600">{highScore}</span>
        </span>
      </div>

      {/* Start Screen */}
      {gamePhase === "idle" && (
        <div className="text-center">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-auto shadow-xl">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Hunt?</h2>
            <p className="text-gray-600 mb-6">
              A target Pokemon will appear briefly. Find it in the grid before time runs out!
            </p>
            <button
              onClick={startGame}
              className="bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-xl hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
            >
              Start Game!
            </button>
          </div>
        </div>
      )}

      {/* Target Preview */}
      {gamePhase === "preview" && target && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-3xl shadow-2xl animate-pulse">
            <h2 className="text-2xl font-bold text-white text-center mb-4">FIND THIS POKEMON!</h2>
            <div className="bg-white rounded-2xl p-6 shadow-inner">
              <div className="relative w-48 h-48 mx-auto mb-4">
                <Image
                  src={target.image}
                  alt={target.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-3xl font-bold text-center text-gray-800">{target.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Game Grid */}
      {(gamePhase === "hunting" || gamePhase === "success" || gamePhase === "failure") && target && (
        <div className="max-w-3xl mx-auto">
          {/* Timer Bar */}
          <div className="mb-4 px-4">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${timerColor} transition-all duration-100 ease-linear`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-1">
              {timeRemaining.toFixed(1)}s remaining
            </p>
          </div>

          {/* Target Reminder */}
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-full px-6 py-2 flex items-center gap-3 shadow">
              <span className="text-lg font-bold text-gray-700">Target:</span>
              <div className="relative w-10 h-10">
                <Image src={target.image} alt="" fill className="object-contain" />
              </div>
              <span className="text-lg font-bold text-yellow-700">{target.name}</span>
            </div>
          </div>

          {/* Personalized Message */}
          {personalizedMessage && (
            <div className="text-center mb-4 animate-bounce">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-2 rounded-full shadow-md text-lg font-semibold">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Pokemon Grid */}
          <div
            className="grid gap-2 mx-auto p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl shadow-xl"
            style={{
              gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
              maxWidth: `${config.gridSize * 80 + (config.gridSize - 1) * 8 + 32}px`,
            }}
          >
            {gridPokemon.map((p, index) => {
              const isTarget = p.id === target.id;
              const isClicked = clickedId === p.id;
              const showSuccess = showSparkles === p.id;

              let cardStyle = "bg-white hover:bg-blue-50 hover:scale-105 border-gray-200";

              if (gamePhase === "success" || gamePhase === "failure") {
                if (isTarget) {
                  cardStyle = "bg-green-100 border-green-500 scale-110 ring-4 ring-green-400";
                } else if (isClicked && !isTarget) {
                  cardStyle = "bg-red-100 border-red-500";
                } else {
                  cardStyle = "bg-gray-100 border-gray-300 opacity-50";
                }
              }

              return (
                <button
                  key={`${p.id}-${index}`}
                  onClick={() => handlePokemonClick(p)}
                  disabled={gamePhase !== "hunting"}
                  className={`relative aspect-square rounded-xl border-2 transition-all duration-200 shadow ${cardStyle} ${
                    gamePhase === "hunting" ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="absolute inset-1">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>

                  {/* Success sparkles */}
                  {showSuccess && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl animate-ping">✨</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gamePhase === "gameover" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold text-blue-600 mb-2">Game Over!</h2>
            <p className="text-xl text-gray-600 mb-2">
              Great job, <span className="font-bold">{playerName}</span>!
            </p>
            <div className="bg-blue-50 rounded-2xl p-4 mb-6">
              <p className="text-2xl font-bold text-blue-600 mb-2">
                Final Score: {score}
              </p>
              <p className="text-lg text-gray-600">
                Best Score: <span className="font-bold text-purple-600">{highScore}</span>
              </p>
              <p className="text-lg text-gray-600">
                Level Reached: <span className="font-bold">{level + 1}</span>
              </p>
            </div>
            {score >= highScore && score > 0 && (
              <div className="bg-yellow-100 rounded-xl p-3 mb-4 animate-pulse">
                <span className="text-xl font-bold text-yellow-700">🏆 New High Score! 🏆</span>
              </div>
            )}
            <button
              onClick={startGame}
              className="bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-xl hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
            >
              Play Again!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
