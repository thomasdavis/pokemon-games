"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";

// Only first 152 Pokemon
const originalPokemon = pokemon.slice(0, 152);

// Fun messages
const popMessages = [
  "Pop! 🎉",
  "Nice! ⭐",
  "Got it! 💥",
  "Boom! 🔥",
  "Yes! ✨",
  "Perfect! 🎯",
  "Amazing! 💫",
  "Wow! 🌟",
];

const missMessages = [
  "It escaped! 🎈",
  "Too slow! ⏰",
  "It got away! 💨",
  "Missed! 🙈",
  "Bye bye! 👋",
];

const getRandomMessage = (popped: boolean) => {
  const messages = popped ? popMessages : missMessages;
  return messages[Math.floor(Math.random() * messages.length)];
};

interface Bubble {
  id: number;
  pokemon: typeof originalPokemon[0];
  x: number;
  y: number;
  speed: number;
  size: number;
  popped: boolean;
  escaped: boolean;
  message?: string;
}

export default function BubbleTypePage() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastPop, setLastPop] = useState<{ message: string; x: number; y: number } | null>(null);
  const nextBubbleId = useRef(0);
  const gameRef = useRef<HTMLDivElement>(null);

  // Difficulty settings based on level
  const getDifficulty = useCallback(() => {
    return {
      spawnRate: Math.max(3500 - (level * 150), 1500), // Slower spawns (3.5s start)
      bubbleSpeed: 0.15 + (level * 0.03), // Much slower bubbles
      maxBubbles: Math.min(2 + Math.floor(level / 3), 6), // Fewer bubbles
    };
  }, [level]);

  // Spawn a new bubble
  const spawnBubble = useCallback(() => {
    if (gameOver) return;

    const difficulty = getDifficulty();

    setBubbles(prev => {
      if (prev.filter(b => !b.popped && !b.escaped).length >= difficulty.maxBubbles) {
        return prev;
      }

      const randomPokemon = originalPokemon[Math.floor(Math.random() * originalPokemon.length)];
      const newBubble: Bubble = {
        id: nextBubbleId.current++,
        pokemon: randomPokemon,
        x: 10 + Math.random() * 80, // Random x position (10-90%)
        y: 100, // Start at bottom
        speed: difficulty.bubbleSpeed + (Math.random() * 0.1),
        size: 120,
        popped: false,
        escaped: false,
      };

      return [...prev, newBubble];
    });
  }, [gameOver, getDifficulty]);

  // Start game
  const startGame = () => {
    setBubbles([]);
    setScore(0);
    setMissed(0);
    setStreak(0);
    setLevel(1);
    setGameOver(false);
    setGameStarted(true);
    nextBubbleId.current = 0;
    gameRef.current?.focus();
  };

  // Spawn bubbles periodically
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const difficulty = getDifficulty();
    const interval = setInterval(spawnBubble, difficulty.spawnRate);

    // Spawn first bubble immediately
    spawnBubble();

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, spawnBubble, getDifficulty]);

  // Move bubbles up
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev.map(bubble => {
          if (bubble.popped || bubble.escaped) return bubble;

          const newY = bubble.y - bubble.speed;

          // Bubble escaped off the top
          if (newY < -15) {
            return { ...bubble, escaped: true, message: getRandomMessage(false) };
          }

          return { ...bubble, y: newY };
        });

        // Count newly escaped bubbles
        const newlyEscaped = updated.filter(b => b.escaped && !prev.find(p => p.id === b.id)?.escaped);
        if (newlyEscaped.length > 0) {
          setMissed(m => {
            const newMissed = m + newlyEscaped.length;
            if (newMissed >= 10) {
              setGameOver(true);
            }
            return newMissed;
          });
          setStreak(0);
        }

        // Remove old popped/escaped bubbles
        return updated.filter(b => {
          if (b.popped) return Date.now() - (b as any).poppedAt < 500;
          if (b.escaped) return Date.now() - (b as any).escapedAt < 500;
          return true;
        });
      });
    }, 30);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  // Handle key press
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!gameStarted || gameOver) return;

    const key = e.key.toUpperCase();

    setBubbles(prev => {
      // Find the lowest bubble (highest y value) that starts with this letter
      const matchingBubbles = prev
        .filter(b => !b.popped && !b.escaped && b.pokemon.name[0].toUpperCase() === key)
        .sort((a, b) => b.y - a.y); // Sort by y descending (lowest on screen first)

      if (matchingBubbles.length === 0) return prev;

      const targetBubble = matchingBubbles[0];
      const message = getRandomMessage(true);

      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        // Level up every 5 pops
        if (newStreak % 5 === 0) {
          setLevel(l => l + 1);
        }
        return newStreak;
      });

      setLastPop({ message, x: targetBubble.x, y: targetBubble.y });
      setTimeout(() => setLastPop(null), 500);

      return prev.map(b =>
        b.id === targetBubble.id
          ? { ...b, popped: true, message, poppedAt: Date.now() } as Bubble & { poppedAt: number }
          : b
      );
    });
  }, [gameStarted, gameOver, bestStreak]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // Focus game area
  useEffect(() => {
    if (gameStarted) {
      gameRef.current?.focus();
    }
  }, [gameStarted]);

  const livesLeft = 10 - missed;

  return (
    <div
      ref={gameRef}
      className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 outline-none overflow-hidden"
      tabIndex={0}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white text-center mb-4 drop-shadow-lg">
            Bubble Type! 🫧
          </h1>

          {gameStarted && !gameOver && (
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="text-3xl font-bold text-green-600">{score}</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="text-3xl font-bold text-orange-500">{streak}</div>
                <div className="text-sm text-gray-600">Streak</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="text-3xl font-bold text-purple-600">{bestStreak}</div>
                <div className="text-sm text-gray-600">Best</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="text-3xl font-bold text-blue-600">{level}</div>
                <div className="text-sm text-gray-600">Level</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="text-3xl font-bold text-red-500">{"❤️".repeat(Math.min(livesLeft, 5))}{livesLeft > 5 ? `+${livesLeft-5}` : ""}</div>
                <div className="text-sm text-gray-600">Lives</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full h-screen">
        {/* Bubbles */}
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className={`absolute transition-all duration-300 ${
              bubble.popped ? "scale-150 opacity-0" :
              bubble.escaped ? "opacity-0 -translate-y-10" : ""
            }`}
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Bubble */}
            <div className={`relative ${bubble.popped ? "" : "animate-pulse"}`}>
              {/* Bubble background */}
              <div
                className={`absolute inset-0 rounded-full ${
                  bubble.popped
                    ? "bg-yellow-300"
                    : "bg-gradient-to-br from-white/60 via-sky-200/60 to-sky-400/60"
                } shadow-xl`}
                style={{
                  width: bubble.size,
                  height: bubble.size,
                  left: -bubble.size/2 + 50,
                  top: -bubble.size/2 + 50,
                }}
              />

              {/* Pokemon image */}
              <div className="relative z-10">
                <Image
                  src={bubble.pokemon.image}
                  alt={bubble.pokemon.name}
                  width={100}
                  height={100}
                  className={bubble.popped ? "brightness-150" : ""}
                />
              </div>

              {/* Pokemon name with first letter highlighted */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg text-lg font-bold">
                  <span className="text-2xl text-red-500">{bubble.pokemon.name[0]}</span>
                  <span className="text-gray-700">{bubble.pokemon.name.slice(1)}</span>
                </span>
              </div>

              {/* Pop message */}
              {bubble.popped && bubble.message && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-yellow-500 drop-shadow-lg animate-bounce">
                  {bubble.message}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Floating pop message */}
        {lastPop && (
          <div
            className="absolute z-30 text-4xl font-bold text-yellow-400 drop-shadow-lg animate-ping"
            style={{
              left: `${lastPop.x}%`,
              top: `${lastPop.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {lastPop.message}
          </div>
        )}
      </div>

      {/* Start Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-md">
            <div className="text-6xl mb-4">🫧</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Bubble Type!</h2>
            <p className="text-xl text-gray-600 mb-6">
              Press the <span className="text-red-500 font-bold">first letter</span> of each Pokemon&apos;s name to pop the bubble!
            </p>
            <div className="text-lg text-gray-500 mb-6">
              <p>🎯 Pop bubbles before they escape!</p>
              <p>❤️ You have 10 lives</p>
              <p>⚡ It gets faster as you level up!</p>
            </div>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-4 px-10 rounded-full text-2xl hover:scale-105 transition-transform shadow-lg"
            >
              Start Game!
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-md">
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Game Over!</h2>
            <div className="text-2xl text-gray-600 mb-6 space-y-2">
              <p>Score: <span className="font-bold text-green-600">{score}</span></p>
              <p>Best Streak: <span className="font-bold text-purple-600">{bestStreak}</span></p>
              <p>Level Reached: <span className="font-bold text-blue-600">{level}</span></p>
            </div>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 px-10 rounded-full text-2xl hover:scale-105 transition-transform shadow-lg"
            >
              Play Again!
            </button>
          </div>
        </div>
      )}

      {/* Instructions at bottom */}
      {gameStarted && !gameOver && (
        <div className="absolute bottom-4 left-0 right-0 text-center z-20">
          <div className="inline-block bg-white/80 backdrop-blur rounded-full px-6 py-3 shadow-lg">
            <span className="text-lg text-gray-700">
              Press the <span className="text-red-500 font-bold text-xl">first letter</span> to pop!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
