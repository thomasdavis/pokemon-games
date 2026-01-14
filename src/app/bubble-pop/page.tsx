"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon as allPokemon } from "@/data/pokemon";

interface Bubble {
  id: number;
  pokemonId: number;
  pokemonName: string;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
}

interface PopEffect {
  id: number;
  x: number;
  y: number;
  pokemonName: string;
}

const RAINBOW_COLORS = [
  "from-red-400 to-red-600",
  "from-orange-400 to-orange-600",
  "from-yellow-400 to-yellow-600",
  "from-green-400 to-green-600",
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
  "from-rose-400 to-rose-600",
];

const MAX_MISSES = 5;
const BASE_SPAWN_INTERVAL = 2000;
const MIN_SPAWN_INTERVAL = 800;
const BASE_BUBBLE_SPEED = 1;
const SPEED_INCREMENT = 0.15;
const DIFFICULTY_INCREASE_INTERVAL = 10000;

export default function BubblePopPage() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [difficulty, setDifficulty] = useState(1);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const bubbleIdRef = useRef(0);
  const effectIdRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const difficultyTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem("pokemonBubblePopHighScore");
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("pokemonBubblePopHighScore", score.toString());
    }
  }, [score, highScore]);

  const getRandomPokemon = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * allPokemon.length);
    return allPokemon[randomIndex];
  }, []);

  const getRandomColor = useCallback(() => {
    const index = Math.floor(Math.random() * RAINBOW_COLORS.length);
    return RAINBOW_COLORS[index];
  }, []);

  const spawnBubble = useCallback(() => {
    if (!gameAreaRef.current) return;

    const gameWidth = gameAreaRef.current.clientWidth;
    const bubbleSize = 100 + Math.random() * 40;
    const maxX = gameWidth - bubbleSize;
    const randomX = Math.max(0, Math.random() * maxX);

    const poke = getRandomPokemon();
    const color = getRandomColor();
    const currentSpeed = BASE_BUBBLE_SPEED + (difficulty - 1) * SPEED_INCREMENT;

    const newBubble: Bubble = {
      id: bubbleIdRef.current++,
      pokemonId: poke.id,
      pokemonName: poke.name,
      x: randomX,
      y: window.innerHeight,
      color: color,
      speed: currentSpeed + Math.random() * 0.5,
      size: bubbleSize,
    };

    setBubbles(prev => [...prev, newBubble]);
  }, [difficulty, getRandomPokemon, getRandomColor]);

  const popBubble = useCallback((bubble: Bubble, e: React.MouseEvent) => {
    e.stopPropagation();

    const newEffect: PopEffect = {
      id: effectIdRef.current++,
      x: bubble.x + bubble.size / 2,
      y: bubble.y + bubble.size / 2,
      pokemonName: bubble.pokemonName,
    };
    setPopEffects(prev => [...prev, newEffect]);

    setTimeout(() => {
      setPopEffects(prev => prev.filter(ef => ef.id !== newEffect.id));
    }, 1000);

    setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    setScore(prev => prev + 10);
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 16;
      lastTimeRef.current = currentTime;

      setBubbles(prev => {
        const updated = prev.map(bubble => ({
          ...bubble,
          y: bubble.y - bubble.speed * deltaTime,
        }));

        const escaped = updated.filter(b => b.y + b.size < 0);
        if (escaped.length > 0) {
          setMisses(m => {
            const newMisses = m + escaped.length;
            if (newMisses >= MAX_MISSES) {
              setGameState("gameover");
            }
            return newMisses;
          });
        }

        return updated.filter(b => b.y + b.size >= 0);
      });

      gameLoopRef.current = requestAnimationFrame(animate);
    };

    gameLoopRef.current = requestAnimationFrame(animate);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const spawnInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      BASE_SPAWN_INTERVAL - (difficulty - 1) * 150
    );

    const spawn = () => {
      spawnBubble();
      spawnTimerRef.current = window.setTimeout(spawn, spawnInterval);
    };

    spawnTimerRef.current = window.setTimeout(spawn, 500);

    return () => {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [gameState, difficulty, spawnBubble]);

  useEffect(() => {
    if (gameState !== "playing") return;

    difficultyTimerRef.current = window.setInterval(() => {
      setDifficulty(d => d + 1);
    }, DIFFICULTY_INCREASE_INTERVAL);

    return () => {
      if (difficultyTimerRef.current) {
        clearInterval(difficultyTimerRef.current);
      }
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setMisses(0);
    setBubbles([]);
    setPopEffects([]);
    setDifficulty(1);
    lastTimeRef.current = 0;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 overflow-hidden relative">
      {/* Decorative clouds */}
      <div className="absolute top-10 left-10 w-32 h-16 bg-white rounded-full opacity-80" />
      <div className="absolute top-20 left-32 w-24 h-12 bg-white rounded-full opacity-70" />
      <div className="absolute top-5 right-20 w-40 h-20 bg-white rounded-full opacity-75" />
      <div className="absolute top-16 right-40 w-28 h-14 bg-white rounded-full opacity-65" />

      {/* Header */}
      <div className="relative z-20 pt-4 pb-2">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-white drop-shadow-lg mb-2">
          🫧 Pokemon Bubble Pop! 🫧
        </h1>

        {gameState === "playing" && (
          <div className="flex justify-center gap-4 flex-wrap px-4">
            <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg">
              <span className="text-xl font-bold text-yellow-600">Score: {score}</span>
            </div>
            <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg">
              <span className="text-xl font-bold text-purple-600">Best: {highScore}</span>
            </div>
            <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg">
              <span className="text-xl font-bold text-red-500">
                Escaped: {misses}/{MAX_MISSES}
              </span>
            </div>
            <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg">
              <span className="text-xl font-bold text-green-600">Level: {difficulty}</span>
            </div>
          </div>
        )}
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative w-full h-[calc(100vh-120px)] overflow-hidden"
      >
        {/* Bubbles */}
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className="absolute cursor-pointer transition-transform hover:scale-110 active:scale-95"
            style={{
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
            }}
            onClick={(e) => popBubble(bubble, e)}
          >
            <div
              className={`w-full h-full rounded-full bg-gradient-to-br ${bubble.color}
                         border-4 border-white/50 shadow-2xl
                         flex items-center justify-center
                         relative overflow-hidden animate-pulse`}
            >
              {/* Bubble shine effect */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-white/60 rounded-full blur-sm" />
              <div className="absolute top-4 left-4 w-3 h-3 bg-white/80 rounded-full" />

              <Image
                src={`/pokemon/${bubble.pokemonId}.png`}
                alt={bubble.pokemonName}
                width={Math.round(bubble.size * 0.65)}
                height={Math.round(bubble.size * 0.65)}
                className="drop-shadow-lg pointer-events-none relative z-10"
                draggable={false}
              />
            </div>
          </div>
        ))}

        {/* Pop Effects */}
        {popEffects.map(effect => (
          <div
            key={effect.id}
            className="absolute pointer-events-none z-30 animate-ping"
            style={{
              left: effect.x,
              top: effect.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-20 h-20 rounded-full border-4 border-yellow-400" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="bg-white/95 px-4 py-2 rounded-full font-bold text-lg shadow-lg text-purple-600">
                {effect.pokemonName}! +10
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Start Screen */}
      {gameState === "start" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl animate-bounce-slow">
            <div className="mb-4">
              <Image
                src="/pokemon/25.png"
                alt="Pikachu"
                width={120}
                height={120}
                className="mx-auto animate-bounce"
              />
            </div>
            <h2 className="text-3xl font-bold text-purple-600 mb-4">
              Pokemon Bubble Pop!
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Pop the bubbles before they float away!
            </p>
            <p className="text-md text-gray-500 mb-6">
              Click on the Pokemon bubbles to catch them.
              <br />
              Don&apos;t let {MAX_MISSES} escape!
            </p>
            {highScore > 0 && (
              <p className="text-xl text-yellow-600 font-bold mb-4">
                High Score: {highScore}
              </p>
            )}
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-12 py-4 rounded-full
                         font-bold text-2xl hover:from-green-500 hover:to-green-700
                         transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              START! 🎮
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
            <div className="mb-4">
              <Image
                src="/pokemon/143.png"
                alt="Snorlax"
                width={120}
                height={120}
                className="mx-auto"
              />
            </div>
            <h2 className="text-3xl font-bold text-red-500 mb-2">
              Game Over!
            </h2>
            <p className="text-2xl text-gray-700 mb-2">
              You caught <span className="font-bold text-purple-600">{Math.floor(score / 10)}</span> Pokemon!
            </p>
            <p className="text-4xl font-bold text-yellow-500 mb-4">
              Score: {score}
            </p>
            {score >= highScore && score > 0 && (
              <div className="bg-yellow-100 rounded-2xl p-3 mb-4">
                <p className="text-xl font-bold text-yellow-600">
                  🏆 New High Score! 🏆
                </p>
              </div>
            )}
            <p className="text-lg text-gray-500 mb-6">
              You reached Level {difficulty}!
            </p>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-purple-400 to-purple-600 text-white px-12 py-4 rounded-full
                         font-bold text-2xl hover:from-purple-500 hover:to-purple-700
                         transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Play Again! 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
