"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Stat types with colors and labels
const STAT_CONFIG = {
  hp: { label: "HP", color: "bg-red-500", textColor: "text-red-500", bgLight: "bg-red-100" },
  attack: { label: "ATK", color: "bg-orange-500", textColor: "text-orange-500", bgLight: "bg-orange-100" },
  defense: { label: "DEF", color: "bg-blue-500", textColor: "text-blue-500", bgLight: "bg-blue-100" },
  special_attack: { label: "SP.ATK", color: "bg-purple-500", textColor: "text-purple-500", bgLight: "bg-purple-100" },
  special_defense: { label: "SP.DEF", color: "bg-green-500", textColor: "text-green-500", bgLight: "bg-green-100" },
  speed: { label: "SPD", color: "bg-yellow-500", textColor: "text-yellow-500", bgLight: "bg-yellow-100" },
} as const;

type StatKey = keyof typeof STAT_CONFIG;

interface StatBlock {
  id: string;
  statType: StatKey;
  value: number;
  pokemonName: string;
}

interface Level {
  name: string;
  description: string;
  numBlocks: number;
  tolerance: number;
  hideTotals: boolean;
  moveLimit: number | null;
}

const LEVELS: Level[] = [
  { name: "Beginner", description: "Balance 4 blocks", numBlocks: 4, tolerance: 15, hideTotals: false, moveLimit: null },
  { name: "Easy", description: "Balance 6 blocks", numBlocks: 6, tolerance: 12, hideTotals: false, moveLimit: null },
  { name: "Medium", description: "Balance 8 blocks", numBlocks: 8, tolerance: 10, hideTotals: false, moveLimit: null },
  { name: "Hard", description: "Hidden totals!", numBlocks: 8, tolerance: 10, hideTotals: true, moveLimit: null },
  { name: "Expert", description: "Balance in 6 moves", numBlocks: 6, tolerance: 10, hideTotals: false, moveLimit: 6 },
  { name: "Master", description: "10 blocks, tight balance", numBlocks: 10, tolerance: 8, hideTotals: false, moveLimit: null },
  { name: "Champion", description: "Hidden totals + limited moves", numBlocks: 8, tolerance: 8, hideTotals: true, moveLimit: 8 },
];

// Get two random Pokemon
function getRandomPokemon(): [Pokemon, Pokemon] {
  const idx1 = Math.floor(Math.random() * pokemon.length);
  let idx2 = Math.floor(Math.random() * pokemon.length);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * pokemon.length);
  }
  return [pokemon[idx1], pokemon[idx2]];
}

// Generate stat blocks from two Pokemon
function generateStatBlocks(p1: Pokemon, p2: Pokemon, numBlocks: number): StatBlock[] {
  const allStats: StatKey[] = ["hp", "attack", "defense", "special_attack", "special_defense", "speed"];
  const blocks: StatBlock[] = [];

  // Create blocks from both Pokemon, alternating
  for (let i = 0; i < numBlocks; i++) {
    const statType = allStats[i % allStats.length];
    const poke = i % 2 === 0 ? p1 : p2;
    blocks.push({
      id: `${poke.id}-${statType}-${i}`,
      statType,
      value: poke[statType],
      pokemonName: poke.name,
    });
  }

  // Shuffle the blocks
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }

  return blocks;
}

// Storage key
const BEST_LEVEL_KEY = "stat_balance_best_level";

export default function StatBalancePage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [currentLevel, setCurrentLevel] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [pokemonPair, setPokemonPair] = useState<[Pokemon, Pokemon] | null>(null);
  const [availableBlocks, setAvailableBlocks] = useState<StatBlock[]>([]);
  const [leftSide, setLeftSide] = useState<StatBlock[]>([]);
  const [rightSide, setRightSide] = useState<StatBlock[]>([]);
  const [movesUsed, setMovesUsed] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [seesawAngle, setSeesawAngle] = useState(0);
  const [isWobbling, setIsWobbling] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<StatBlock | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);

  // Refs for drop zones
  const leftDropRef = useRef<HTMLDivElement>(null);
  const rightDropRef = useRef<HTMLDivElement>(null);
  const availableDropRef = useRef<HTMLDivElement>(null);

  // Current level config
  const level = LEVELS[currentLevel];

  // Calculate totals
  const leftTotal = leftSide.reduce((sum, b) => sum + b.value, 0);
  const rightTotal = rightSide.reduce((sum, b) => sum + b.value, 0);
  const difference = Math.abs(leftTotal - rightTotal);
  const isBalanced = difference <= level.tolerance;
  const allBlocksPlaced = availableBlocks.length === 0;

  // Load best level
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(BEST_LEVEL_KEY);
      if (saved) {
        setBestLevel(parseInt(saved, 10));
      }
    }
  }, []);

  // Save best level
  useEffect(() => {
    if (typeof window !== "undefined" && bestLevel > 0) {
      localStorage.setItem(BEST_LEVEL_KEY, bestLevel.toString());
    }
  }, [bestLevel]);

  // Update seesaw angle based on weight difference
  useEffect(() => {
    if (leftTotal === 0 && rightTotal === 0) {
      setSeesawAngle(0);
      return;
    }

    const total = leftTotal + rightTotal;
    const diff = leftTotal - rightTotal;
    // Max angle of 20 degrees
    const angle = (diff / (total || 1)) * 20;
    setSeesawAngle(Math.max(-20, Math.min(20, angle)));
  }, [leftTotal, rightTotal]);

  // Initialize game
  const initGame = useCallback(() => {
    const [p1, p2] = getRandomPokemon();
    setPokemonPair([p1, p2]);
    const blocks = generateStatBlocks(p1, p2, level.numBlocks);
    setAvailableBlocks(blocks);
    setLeftSide([]);
    setRightSide([]);
    setMovesUsed(0);
    setGameState("playing");
    setFeedbackMessage(null);
    speak(`Level ${currentLevel + 1}: ${level.name}! Balance the seesaw!`);
  }, [currentLevel, level.numBlocks, level.name]);

  // Start game on mount and level change
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Check win/lose conditions
  useEffect(() => {
    if (gameState !== "playing") return;

    if (allBlocksPlaced) {
      if (isBalanced) {
        setGameState("won");
        playSound("success");

        const newBest = Math.max(bestLevel, currentLevel + 1);
        if (newBest > bestLevel) {
          setBestLevel(newBest);
          speak(`Amazing ${playerName}! You mastered level ${currentLevel + 1}!`);
        } else {
          speak(`Well done ${playerName}! The seesaw is balanced!`);
        }

        const feedback = getQuickPersonalizedMessage(playerName, "won_game", { score: currentLevel + 1 });
        setFeedbackMessage(feedback);
      } else {
        // Only lose if move limit is reached or all blocks placed and not balanced
        if (level.moveLimit && movesUsed >= level.moveLimit) {
          setGameState("lost");
          playSound("error");
          speak("The seesaw is too uneven! Try again!");
          const feedback = getQuickPersonalizedMessage(playerName, "lost_game");
          setFeedbackMessage(feedback);
        }
      }
    } else if (level.moveLimit && movesUsed >= level.moveLimit) {
      setGameState("lost");
      playSound("error");
      speak("Out of moves! Try again!");
      const feedback = getQuickPersonalizedMessage(playerName, "lost_game");
      setFeedbackMessage(feedback);
    }
  }, [allBlocksPlaced, isBalanced, movesUsed, level.moveLimit, gameState, currentLevel, bestLevel, playerName]);

  // Wobble animation
  const triggerWobble = useCallback(() => {
    setIsWobbling(true);
    setTimeout(() => setIsWobbling(false), 500);
  }, []);

  // Handle drag start
  const handleDragStart = (block: StatBlock, source: "available" | "left" | "right") => {
    setDraggingBlock(block);
  };

  // Handle drop
  const handleDrop = (target: "available" | "left" | "right") => {
    if (!draggingBlock) return;

    // Find and remove from current location
    let newAvailable = [...availableBlocks];
    let newLeft = [...leftSide];
    let newRight = [...rightSide];

    // Remove from all arrays
    newAvailable = newAvailable.filter(b => b.id !== draggingBlock.id);
    newLeft = newLeft.filter(b => b.id !== draggingBlock.id);
    newRight = newRight.filter(b => b.id !== draggingBlock.id);

    // Add to target
    if (target === "available") {
      newAvailable.push(draggingBlock);
    } else if (target === "left") {
      newLeft.push(draggingBlock);
    } else {
      newRight.push(draggingBlock);
    }

    setAvailableBlocks(newAvailable);
    setLeftSide(newLeft);
    setRightSide(newRight);
    setMovesUsed(m => m + 1);
    setDraggingBlock(null);

    playSound("bounce");
    triggerWobble();

    // Check balance status
    const newLeftTotal = newLeft.reduce((sum, b) => sum + b.value, 0);
    const newRightTotal = newRight.reduce((sum, b) => sum + b.value, 0);
    const newDiff = Math.abs(newLeftTotal - newRightTotal);

    if (newDiff <= level.tolerance && newAvailable.length === 0) {
      // Will be handled by useEffect
    } else if (newDiff > 100) {
      playSound("error");
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Touch handling for mobile
  const handleTouchStart = (block: StatBlock) => {
    setDraggingBlock(block);
  };

  const handleTouchEnd = (e: React.TouchEvent, target: "available" | "left" | "right") => {
    if (draggingBlock) {
      handleDrop(target);
    }
  };

  // Next level
  const nextLevel = () => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel(currentLevel + 1);
    } else {
      // Loop back with congratulations
      speak("You've mastered all levels! Starting again!");
      setCurrentLevel(0);
    }
  };

  // Retry level
  const retryLevel = () => {
    initGame();
  };

  // Render stat block
  const renderStatBlock = (block: StatBlock, source: "available" | "left" | "right") => {
    const config = STAT_CONFIG[block.statType];

    return (
      <div
        key={block.id}
        draggable
        onDragStart={() => handleDragStart(block, source)}
        onTouchStart={() => handleTouchStart(block)}
        className={`
          ${config.color} text-white px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing
          shadow-lg hover:scale-110 transition-transform select-none
          flex flex-col items-center min-w-[70px]
          ${draggingBlock?.id === block.id ? "opacity-50" : ""}
        `}
      >
        <span className="text-xs font-bold opacity-80">{config.label}</span>
        <span className="text-xl font-black">{block.value}</span>
        <span className="text-[10px] opacity-70 truncate max-w-full">{block.pokemonName}</span>
      </div>
    );
  };

  // Balance indicator color
  const getBalanceColor = () => {
    if (difference <= level.tolerance) return "text-green-500";
    if (difference <= level.tolerance * 2) return "text-yellow-500";
    return "text-red-500";
  };

  if (!pokemonPair) return null;

  return (
    <div className="py-6 px-4 min-h-screen">
      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
        Stat Balance: Seesaw Builder
      </h1>
      <p className="text-center text-lg text-purple-400 mb-4">
        Balance the Pokemon stats on the seesaw!
      </p>

      {/* Player info and level */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="text-lg">&#x1F464;</span>
          <span className="font-bold text-purple-600">{playerName}</span>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 rounded-full shadow-lg text-white">
          <span className="font-bold">Level {currentLevel + 1}: {level.name}</span>
        </div>
        {bestLevel > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 rounded-full shadow-lg text-white">
            <span className="font-bold">Best: Level {bestLevel}</span>
          </div>
        )}
        {level.moveLimit && (
          <div className={`px-4 py-2 rounded-full shadow-lg text-white ${
            movesUsed >= level.moveLimit ? "bg-red-500" : "bg-gradient-to-r from-green-500 to-teal-500"
          }`}>
            <span className="font-bold">Moves: {movesUsed}/{level.moveLimit}</span>
          </div>
        )}
      </div>

      {/* Level description */}
      <div className="text-center text-sm text-gray-500 mb-4">
        {level.description} | Balance within {level.tolerance} points
      </div>

      {/* Pokemon display */}
      <div className="flex justify-center items-center gap-4 mb-4">
        <div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full shadow">
          <Image src={pokemonPair[0].image} alt={pokemonPair[0].name} width={40} height={40} />
          <span className="font-bold text-sm text-gray-700">{pokemonPair[0].name}</span>
        </div>
        <span className="text-2xl">VS</span>
        <div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full shadow">
          <Image src={pokemonPair[1].image} alt={pokemonPair[1].name} width={40} height={40} />
          <span className="font-bold text-sm text-gray-700">{pokemonPair[1].name}</span>
        </div>
      </div>

      {/* Available blocks */}
      <div
        ref={availableDropRef}
        onDrop={() => handleDrop("available")}
        onDragOver={handleDragOver}
        className="max-w-2xl mx-auto mb-6"
      >
        <div className="text-center text-sm font-bold text-gray-600 mb-2">
          Drag blocks to balance the seesaw ({availableBlocks.length} remaining)
        </div>
        <div className="flex flex-wrap justify-center gap-2 p-4 bg-gray-100 rounded-2xl min-h-[80px] border-2 border-dashed border-gray-300">
          {availableBlocks.map(block => renderStatBlock(block, "available"))}
          {availableBlocks.length === 0 && (
            <div className="text-gray-400 italic">All blocks placed!</div>
          )}
        </div>
      </div>

      {/* Seesaw section */}
      <div className="max-w-4xl mx-auto relative">
        {/* Balance indicator */}
        <div className="text-center mb-2">
          {!level.hideTotals && (
            <div className={`text-2xl font-bold ${getBalanceColor()}`}>
              {isBalanced && allBlocksPlaced ? (
                <span className="text-green-500">BALANCED!</span>
              ) : (
                <span>
                  Difference: {difference}
                  {difference <= level.tolerance ? " (OK!)" : ` (need ${level.tolerance} or less)`}
                </span>
              )}
            </div>
          )}
          {level.hideTotals && (
            <div className="text-xl font-bold text-purple-500">
              Totals hidden! Trust your instincts!
            </div>
          )}
        </div>

        {/* Seesaw */}
        <div className="relative h-[300px] md:h-[350px]">
          {/* Fulcrum (triangle base) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[40px] border-r-[40px] border-b-[60px] border-l-transparent border-r-transparent border-b-amber-600 z-10" />

          {/* Seesaw plank */}
          <div
            className={`absolute bottom-[55px] left-1/2 w-[90%] h-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 rounded-full shadow-lg transition-transform duration-500 ${isWobbling ? "animate-wobble" : ""}`}
            style={{
              transform: `translateX(-50%) rotate(${seesawAngle}deg)`,
              transformOrigin: "center center",
            }}
          >
            {/* Left platform */}
            <div
              ref={leftDropRef}
              onDrop={() => handleDrop("left")}
              onDragOver={handleDragOver}
              onTouchEnd={(e) => handleTouchEnd(e, "left")}
              className={`absolute -left-2 bottom-full w-[45%] min-h-[180px] bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-2xl border-2 ${
                draggingBlock ? "border-blue-500 border-dashed" : "border-blue-300"
              } flex flex-col items-center p-2 shadow-inner`}
              style={{ transform: `rotate(${-seesawAngle}deg)` }}
            >
              <div className="text-xs font-bold text-blue-600 mb-2">
                LEFT {!level.hideTotals && `(${leftTotal})`}
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {leftSide.map(block => renderStatBlock(block, "left"))}
              </div>
              {leftSide.length === 0 && (
                <div className="text-gray-400 text-sm italic mt-4">Drop here</div>
              )}
            </div>

            {/* Right platform */}
            <div
              ref={rightDropRef}
              onDrop={() => handleDrop("right")}
              onDragOver={handleDragOver}
              onTouchEnd={(e) => handleTouchEnd(e, "right")}
              className={`absolute -right-2 bottom-full w-[45%] min-h-[180px] bg-gradient-to-br from-pink-100 to-pink-200 rounded-t-2xl border-2 ${
                draggingBlock ? "border-pink-500 border-dashed" : "border-pink-300"
              } flex flex-col items-center p-2 shadow-inner`}
              style={{ transform: `rotate(${-seesawAngle}deg)` }}
            >
              <div className="text-xs font-bold text-pink-600 mb-2">
                RIGHT {!level.hideTotals && `(${rightTotal})`}
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {rightSide.map(block => renderStatBlock(block, "right"))}
              </div>
              {rightSide.length === 0 && (
                <div className="text-gray-400 text-sm italic mt-4">Drop here</div>
              )}
            </div>
          </div>

          {/* Ground decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-green-600 to-green-400 rounded-t-full" />
        </div>
      </div>

      {/* Win/Lose overlay */}
      {gameState !== "playing" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-4 text-center transform ${
            gameState === "won" ? "animate-bounce-in" : "animate-shake-in"
          }`}>
            {gameState === "won" ? (
              <>
                <div className="text-6xl mb-4">&#x2696;&#xFE0F;</div>
                <h2 className="text-3xl font-bold text-green-600 mb-2">BALANCED!</h2>
                <p className="text-gray-600 mb-2">
                  Left: {leftTotal} | Right: {rightTotal}
                </p>
                <p className="text-gray-500 mb-4">
                  Difference: {difference} (tolerance: {level.tolerance})
                </p>
                {feedbackMessage && (
                  <p className="text-xl text-purple-600 mb-4">
                    {feedbackMessage.emoji} {feedbackMessage.message}
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={nextLevel}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-lg"
                  >
                    Next Level
                  </button>
                  <button
                    onClick={retryLevel}
                    className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 shadow-lg"
                  >
                    Retry
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">&#x1F61E;</div>
                <h2 className="text-3xl font-bold text-red-600 mb-2">TOO UNEVEN!</h2>
                <p className="text-gray-600 mb-2">
                  Left: {leftTotal} | Right: {rightTotal}
                </p>
                <p className="text-gray-500 mb-4">
                  Difference: {difference} (needed: {level.tolerance} or less)
                </p>
                {feedbackMessage && (
                  <p className="text-xl text-orange-500 mb-4">
                    {feedbackMessage.emoji} {feedbackMessage.message}
                  </p>
                )}
                <button
                  onClick={retryLevel}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-lg"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Level selector */}
      <div className="max-w-4xl mx-auto mt-8">
        <h3 className="text-center text-lg font-bold text-gray-600 mb-3">Select Level</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {LEVELS.map((lvl, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentLevel(idx)}
              disabled={gameState !== "playing"}
              className={`px-4 py-2 rounded-full font-bold transition-all ${
                idx === currentLevel
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg"
                  : idx <= bestLevel
                  ? "bg-white text-purple-600 hover:bg-purple-100 shadow"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {idx + 1}. {lvl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stat legend */}
      <div className="max-w-2xl mx-auto mt-6">
        <h3 className="text-center text-sm font-bold text-gray-500 mb-2">Stat Colors</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {Object.entries(STAT_CONFIG).map(([key, config]) => (
            <div key={key} className={`${config.color} text-white px-3 py-1 rounded-full text-xs font-bold`}>
              {config.label}
            </div>
          ))}
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes wobble {
          0%, 100% { transform: translateX(-50%) rotate(${seesawAngle}deg); }
          25% { transform: translateX(-50%) rotate(${seesawAngle - 3}deg); }
          75% { transform: translateX(-50%) rotate(${seesawAngle + 3}deg); }
        }
        .animate-wobble {
          animation: wobble 0.5s ease-out;
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes shake-in {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .animate-shake-in {
          animation: shake-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
