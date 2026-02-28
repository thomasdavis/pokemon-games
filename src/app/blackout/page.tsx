"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, announcePokemon, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

type GameState = "playing" | "guessing" | "revealed";
type GridSize = 6 | 8;

const GRID_SETTINGS: Record<GridSize, { label: string; color: string }> = {
  6: { label: "6x6 Grid", color: "bg-green-500" },
  8: { label: "8x8 Grid", color: "bg-orange-500" },
};

const BASE_SCORE = 100;
const POINTS_PER_TILE = 5;

export default function BlackoutPage() {
  const { name: playerName } = usePlayer();
  const [gridSize, setGridSize] = useState<GridSize>(6);
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [gameState, setGameState] = useState<GameState>("playing");
  const [options, setOptions] = useState<Pokemon[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [personalizedMessage, setPersonalizedMessage] = useState<{
    message: string;
    emoji: string;
  } | null>(null);
  const [animatingTile, setAnimatingTile] = useState<number | null>(null);

  // Load best score from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pokemon_blackout_best_score");
    if (stored) {
      setBestScore(parseInt(stored, 10));
    }
  }, []);

  // Save best score to localStorage
  const updateBestScore = useCallback((newScore: number) => {
    if (newScore > bestScore) {
      setBestScore(newScore);
      localStorage.setItem("pokemon_blackout_best_score", String(newScore));
      return true;
    }
    return false;
  }, [bestScore]);

  const generateRound = useCallback(() => {
    // Get first 150 Pokemon for simplicity (classic Pokemon)
    const classicPokemon = pokemon.slice(0, 150);
    const shuffled = [...classicPokemon].sort(() => Math.random() - 0.5);
    const answer = shuffled[0];
    const wrongAnswers = shuffled.slice(1, 6);
    const allOptions = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    setCurrentPokemon(answer);
    setOptions(allOptions);
    setRevealedTiles(new Set());
    setGameState("playing");
    setIsCorrect(null);
    setPersonalizedMessage(null);
    setRoundScore(BASE_SCORE);
    setAnimatingTile(null);

    // Announce game start
    speak("Reveal tiles to see the Pokemon!", { rate: 1.0, pitch: 1.1 });
  }, []);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleTileClick = (index: number) => {
    if (gameState !== "playing" || revealedTiles.has(index)) return;

    // Play pop sound
    playSound("pop", { volume: 0.7 });

    // Animate tile
    setAnimatingTile(index);
    setTimeout(() => setAnimatingTile(null), 300);

    // Reveal tile
    const newRevealed = new Set(revealedTiles);
    newRevealed.add(index);
    setRevealedTiles(newRevealed);

    // Update score
    const newRoundScore = Math.max(0, BASE_SCORE - newRevealed.size * POINTS_PER_TILE);
    setRoundScore(newRoundScore);

    // Encourage reveals at certain points
    const totalTiles = gridSize * gridSize;
    const revealedPercent = newRevealed.size / totalTiles;

    if (newRevealed.size === 1) {
      speak("Great start!", { rate: 1.1, pitch: 1.2 });
    } else if (revealedPercent >= 0.25 && revealedPercent < 0.3) {
      speak("Looking good!", { rate: 1.0, pitch: 1.1 });
    } else if (revealedPercent >= 0.5 && revealedPercent < 0.55) {
      speak("Half way there!", { rate: 1.0, pitch: 1.1 });
    }
  };

  const handleGuessNow = () => {
    if (gameState !== "playing") return;
    playSound("click", { volume: 0.6 });
    setGameState("guessing");
    speak("Who is that Pokemon?", { rate: 0.9, pitch: 1.0 });
  };

  const handleGuess = (guess: Pokemon) => {
    if (gameState !== "guessing" || !currentPokemon) return;

    playSound("click", { volume: 0.6 });
    setGameState("revealed");

    // Reveal all tiles for the answer
    const allTiles = new Set(
      Array.from({ length: gridSize * gridSize }, (_, i) => i)
    );
    setRevealedTiles(allTiles);

    if (guess.id === currentPokemon.id) {
      // Correct!
      setIsCorrect(true);
      const earnedScore = roundScore;
      const newTotalScore = score + earnedScore;
      setScore(newTotalScore);

      // Check for new high score
      const isNewHighScore = updateBestScore(newTotalScore);

      // Play sounds
      playSound("success");
      announcePokemon(currentPokemon.name);

      if (isNewHighScore) {
        setTimeout(() => {
          playSound("coin");
          celebrateWin();
        }, 500);
        const msg = getQuickPersonalizedMessage(playerName, "new_high_score", {
          score: newTotalScore,
        });
        setPersonalizedMessage(msg);
      } else if (earnedScore >= 80) {
        // Great score with few reveals
        playSound("win");
        const msg = getQuickPersonalizedMessage(playerName, "won_game", {
          score: earnedScore,
        });
        setPersonalizedMessage(msg);
      } else {
        const msg = getQuickPersonalizedMessage(playerName, "correct_answer");
        setPersonalizedMessage(msg);
      }
    } else {
      // Wrong!
      setIsCorrect(false);
      playSound("error");
      speak(`Oops! It was ${currentPokemon.name}!`, { rate: 0.9, pitch: 1.0 });
      const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setPersonalizedMessage(msg);
    }
  };

  const handleNextRound = () => {
    setPersonalizedMessage(null);
    generateRound();
  };

  const handleNewGame = () => {
    setScore(0);
    setPersonalizedMessage(null);
    generateRound();
  };

  const totalTiles = gridSize * gridSize;
  const revealedCount = revealedTiles.size;

  return (
    <div className="py-8">
      {/* Player Name Display */}
      <div className="text-center mb-4">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg font-semibold text-yellow-800 shadow">
          Player: {playerName}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-2">
        PokeBlackout
      </h1>
      <p className="text-center text-gray-600 mb-6">
        Reveal tiles to uncover the Pokemon - fewer clicks = more points!
      </p>

      {/* Settings Panel */}
      <div className="max-w-xl mx-auto mb-6 bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-center gap-4 mb-4">
          {(Object.keys(GRID_SETTINGS) as unknown as GridSize[]).map((size) => (
            <button
              key={size}
              onClick={() => {
                setGridSize(Number(size) as GridSize);
                handleNewGame();
              }}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                gridSize === Number(size)
                  ? `${GRID_SETTINGS[size as GridSize].color} text-white scale-105 shadow-md`
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {GRID_SETTINGS[size as GridSize].label}
            </button>
          ))}
        </div>

        {/* Score Display */}
        <div className="flex justify-center gap-6 text-lg">
          <span className="bg-indigo-100 px-4 py-2 rounded-full">
            Score: <span className="font-bold text-indigo-600">{score}</span>
          </span>
          <span className="bg-amber-100 px-4 py-2 rounded-full">
            Best: <span className="font-bold text-amber-600">{bestScore}</span>
          </span>
          <span className="bg-green-100 px-4 py-2 rounded-full">
            Round: <span className="font-bold text-green-600">{roundScore}</span>
          </span>
        </div>
      </div>

      {currentPokemon && (
        <div className="max-w-lg mx-auto">
          {/* Tile Grid Over Pokemon Image */}
          <div className="relative mx-auto mb-6 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-4 shadow-2xl">
            {/* Glow effect for revealed area */}
            <div
              className="absolute inset-4 rounded-2xl transition-all duration-500 pointer-events-none"
              style={{
                boxShadow:
                  revealedCount > 0
                    ? `0 0 ${Math.min(revealedCount * 2, 40)}px ${Math.min(revealedCount, 20)}px rgba(255, 215, 0, 0.3)`
                    : "none",
              }}
            />

            {/* Pokemon Image Container */}
            <div className="relative w-[320px] h-[320px] mx-auto">
              {/* Pokemon Image */}
              <Image
                src={currentPokemon.image}
                alt="Mystery Pokemon"
                fill
                className="object-contain z-0"
                priority
              />

              {/* Tile Grid Overlay */}
              <div
                className="absolute inset-0 grid z-10"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                  gap: "2px",
                }}
              >
                {Array.from({ length: totalTiles }, (_, index) => {
                  const isRevealed = revealedTiles.has(index);
                  const isAnimating = animatingTile === index;

                  return (
                    <button
                      key={index}
                      onClick={() => handleTileClick(index)}
                      disabled={isRevealed || gameState !== "playing"}
                      className={`
                        transition-all duration-300 ease-out
                        ${
                          isRevealed
                            ? "bg-transparent opacity-0 cursor-default"
                            : "bg-slate-800 hover:bg-slate-600 cursor-pointer hover:scale-105 shadow-lg"
                        }
                        ${isAnimating ? "animate-ping" : ""}
                        rounded-sm border border-slate-600
                      `}
                      style={{
                        transform: isAnimating ? "scale(0)" : undefined,
                        opacity: isRevealed ? 0 : 1,
                      }}
                      aria-label={`Tile ${index + 1}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Tiles revealed counter */}
            <div className="text-center mt-4 text-white">
              <span className="bg-white/20 px-4 py-1 rounded-full text-sm">
                Tiles Revealed: {revealedCount} / {totalTiles}
              </span>
            </div>
          </div>

          {/* Message Display */}
          {gameState === "revealed" && (
            <div
              className={`text-center text-3xl font-bold mb-4 animate-bounce ${
                isCorrect ? "text-green-600" : "text-red-500"
              }`}
            >
              {isCorrect
                ? `Yes! It's ${currentPokemon.name}! +${roundScore} points!`
                : `Oops! It was ${currentPokemon.name}!`}
            </div>
          )}

          {/* Personalized Message */}
          {personalizedMessage && (
            <div className="text-center text-xl mb-6 animate-pulse">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-2 rounded-full shadow-md">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Guess Now Button (during playing state) */}
          {gameState === "playing" && (
            <div className="text-center mb-6">
              <button
                onClick={handleGuessNow}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-10 py-4 rounded-full font-bold text-xl hover:from-indigo-600 hover:to-purple-600 transition-all hover:scale-105 shadow-lg animate-pulse"
              >
                Guess Now! ({roundScore} pts)
              </button>
            </div>
          )}

          {/* Options Grid (during guessing state) */}
          {gameState === "guessing" && (
            <div className="mb-6">
              <p className="text-center text-lg text-gray-700 mb-4 font-semibold">
                Which Pokemon is it?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGuess(option)}
                    className="bg-white hover:bg-yellow-100 p-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg border-4 border-transparent hover:border-yellow-400 flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 relative opacity-50">
                      <Image
                        src={option.image}
                        alt={option.name}
                        fill
                        className="object-contain brightness-0"
                      />
                    </div>
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next/New Game Buttons (after reveal) */}
          {gameState === "revealed" && (
            <div className="text-center flex justify-center gap-4">
              <button
                onClick={handleNextRound}
                className="bg-green-500 text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg"
              >
                Next Pokemon!
              </button>
              <button
                onClick={handleNewGame}
                className="bg-gray-500 text-white px-6 py-4 rounded-full font-bold text-lg hover:bg-gray-600 transition-all hover:scale-105 shadow-lg"
              >
                Reset Score
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="max-w-xl mx-auto mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 shadow">
        <h3 className="font-bold text-indigo-800 mb-2 text-center">
          How to Play
        </h3>
        <ul className="text-gray-700 space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-indigo-500">1.</span>
            Click tiles to reveal parts of the hidden Pokemon
          </li>
          <li className="flex items-center gap-2">
            <span className="text-indigo-500">2.</span>
            Each tile costs 5 points from your round score (starting at 100)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-indigo-500">3.</span>
            Click &quot;Guess Now&quot; when you think you know who it is
          </li>
          <li className="flex items-center gap-2">
            <span className="text-indigo-500">4.</span>
            Pick the right Pokemon from 6 choices to earn points!
          </li>
        </ul>
      </div>
    </div>
  );
}
