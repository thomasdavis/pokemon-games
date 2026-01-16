"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, announcePokemon, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

interface Berry {
  id: number;
  color: string;
  name: string;
  emoji: string;
  position: { x: number; y: number };
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

const BERRY_TYPES = [
  { color: "red", name: "Oran Berry", emoji: "🍎", bgClass: "from-red-400 to-red-600" },
  { color: "blue", name: "Cheri Berry", emoji: "🫐", bgClass: "from-blue-400 to-blue-600" },
  { color: "yellow", name: "Sitrus Berry", emoji: "🍋", bgClass: "from-yellow-400 to-yellow-500" },
  { color: "pink", name: "Pecha Berry", emoji: "🍑", bgClass: "from-pink-400 to-pink-500" },
  { color: "green", name: "Rawst Berry", emoji: "🍐", bgClass: "from-green-400 to-green-600" },
];

const BERRIES_NEEDED = 4;

export default function FeedPage() {
  const { name: playerName } = usePlayer();
  const [currentPokemon, setCurrentPokemon] = useState<typeof pokemon[0] | null>(null);
  const [happiness, setHappiness] = useState(0);
  const [berries, setBerries] = useState<Berry[]>([]);
  const [happyPokemonCount, setHappyPokemonCount] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [draggedBerry, setDraggedBerry] = useState<Berry | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [personalizedMessage, setPersonalizedMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pokemonRef = useRef<HTMLDivElement>(null);

  const getRandomPokemon = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * pokemon.length);
    return pokemon[randomIndex];
  }, []);

  const generateBerryPositions = useCallback(() => {
    const positions: Berry[] = [];
    const usedPositions: { x: number; y: number }[] = [];

    // Generate 5 berries at different positions around the edges
    BERRY_TYPES.forEach((berryType, index) => {
      let position: { x: number; y: number };
      let attempts = 0;

      do {
        // Place berries around the edges
        const side = index % 4;
        switch (side) {
          case 0: // Top
            position = { x: 15 + Math.random() * 70, y: 5 + Math.random() * 10 };
            break;
          case 1: // Right
            position = { x: 80 + Math.random() * 15, y: 20 + Math.random() * 50 };
            break;
          case 2: // Bottom
            position = { x: 15 + Math.random() * 70, y: 80 + Math.random() * 15 };
            break;
          case 3: // Left
            position = { x: 3 + Math.random() * 12, y: 20 + Math.random() * 50 };
            break;
          default:
            position = { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };
        }
        attempts++;
      } while (
        usedPositions.some(
          (p) => Math.abs(p.x - position.x) < 15 && Math.abs(p.y - position.y) < 15
        ) &&
        attempts < 20
      );

      usedPositions.push(position);
      positions.push({
        id: index,
        ...berryType,
        position,
      });
    });

    return positions;
  }, []);

  const startNewRound = useCallback(() => {
    const newPokemon = getRandomPokemon();
    setCurrentPokemon(newPokemon);
    setHappiness(0);
    setBerries(generateBerryPositions());
    setIsCelebrating(false);
    setFloatingHearts([]);
    setSparkles([]);
    setPersonalizedMessage(null);
    // Announce the new Pokemon
    announcePokemon(newPokemon.name);
    playSound('ding');
  }, [getRandomPokemon, generateBerryPositions]);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  const addFloatingHeart = (x: number, y: number) => {
    const heartId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1000);
  };

  const triggerCelebration = useCallback(() => {
    setIsCelebrating(true);
    // Play celebration sounds and speech
    playSound('success');
    celebrateWin();

    // Get personalized message for fully fed Pokemon
    if (currentPokemon) {
      const { message, emoji } = getQuickPersonalizedMessage(playerName, 'fed_pokemon', {
        pokemonName: currentPokemon.name,
      });
      setPersonalizedMessage(`${emoji} ${message}`);
    }

    // Create sparkles around the Pokemon
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 20; i++) {
      newSparkles.push({
        id: i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 50,
        delay: Math.random() * 0.5,
      });
    }
    setSparkles(newSparkles);

    setTimeout(() => {
      setHappyPokemonCount((prev) => prev + 1);
      startNewRound();
    }, 2500);
  }, [currentPokemon, playerName, startNewRound]);

  const handleMouseDown = (e: React.MouseEvent, berry: Berry) => {
    e.preventDefault();
    setDraggedBerry(berry);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggedBerry) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    },
    [draggedBerry]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (draggedBerry && pokemonRef.current) {
        const pokemonRect = pokemonRef.current.getBoundingClientRect();
        const dropX = e.clientX;
        const dropY = e.clientY;

        // Check if dropped on Pokemon (generous hitbox for young children)
        const isOnPokemon =
          dropX >= pokemonRect.left - 30 &&
          dropX <= pokemonRect.right + 30 &&
          dropY >= pokemonRect.top - 30 &&
          dropY <= pokemonRect.bottom + 30;

        if (isOnPokemon) {
          // Feed the Pokemon!
          const newHappiness = happiness + 1;
          setHappiness(newHappiness);
          setBerries((prev) => prev.filter((b) => b.id !== draggedBerry.id));

          // Play feeding sound and speak
          playSound('pop');
          speak("Yummy!");

          // Add floating heart at drop position
          addFloatingHeart(
            ((dropX - (containerRef.current?.getBoundingClientRect().left || 0)) /
              (containerRef.current?.getBoundingClientRect().width || 1)) *
              100,
            ((dropY - (containerRef.current?.getBoundingClientRect().top || 0)) /
              (containerRef.current?.getBoundingClientRect().height || 1)) *
              100
          );

          // Check if fully fed
          if (newHappiness >= BERRIES_NEEDED) {
            triggerCelebration();
          }
        }
      }
      setDraggedBerry(null);
    },
    [draggedBerry, happiness, triggerCelebration]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getExpressionClass = () => {
    if (isCelebrating) return "scale-110 animate-bounce";
    if (happiness >= 3) return "scale-105";
    if (happiness >= 2) return "scale-102";
    return "";
  };

  const getMoodText = () => {
    if (isCelebrating) return "SO HAPPY!";
    if (happiness === 0) return "Hungry...";
    if (happiness === 1) return "Yum!";
    if (happiness === 2) return "More please!";
    if (happiness === 3) return "Almost full!";
    return "Delicious!";
  };

  const getMoodEmoji = () => {
    if (isCelebrating) return "🎉";
    if (happiness === 0) return "😢";
    if (happiness === 1) return "😊";
    if (happiness === 2) return "😄";
    if (happiness === 3) return "😍";
    return "🥰";
  };

  if (!currentPokemon) return null;

  return (
    <div className="py-4 select-none">
      <h1 className="text-4xl font-bold text-center text-orange-500 mb-2">
        {playerName}'s Feeding Time!
      </h1>

      {/* Score Display */}
      <div className="text-center mb-4">
        <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-2 rounded-full text-xl font-bold shadow-lg">
          {playerName}'s Happy Pokemon: {happyPokemonCount}
        </div>
      </div>

      {/* Happiness Meter */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex items-center gap-3 bg-white/80 p-3 rounded-2xl shadow-lg">
          <span className="text-2xl">{getMoodEmoji()}</span>
          <div className="flex-1 h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCelebrating
                  ? "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 animate-pulse"
                  : "bg-gradient-to-r from-green-400 to-green-600"
              }`}
              style={{ width: `${(happiness / BERRIES_NEEDED) * 100}%` }}
            />
          </div>
          <span className="text-lg font-bold text-gray-600 min-w-[80px]">
            {getMoodText()}
          </span>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl mx-auto aspect-square bg-gradient-to-b from-sky-300 via-sky-200 to-green-300 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Decorative clouds */}
        <div className="absolute top-4 left-8 text-6xl opacity-60">
          <span className="text-white drop-shadow-lg">&#9729;</span>
        </div>
        <div className="absolute top-12 right-12 text-5xl opacity-50">
          <span className="text-white drop-shadow-lg">&#9729;</span>
        </div>

        {/* Sun */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-yellow-300 rounded-full shadow-lg flex items-center justify-center animate-pulse">
          <span className="text-3xl">&#9728;</span>
        </div>

        {/* Ground/grass decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-500 to-transparent" />
        <div className="absolute bottom-2 left-0 right-0 flex justify-around">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="text-3xl text-green-600 opacity-70">
              &#127807;
            </span>
          ))}
        </div>

        {/* Floating Hearts */}
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute text-4xl pointer-events-none animate-float-up"
            style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
          >
            &#10084;&#65039;
          </div>
        ))}

        {/* Celebration Sparkles */}
        {isCelebrating &&
          sparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute text-3xl pointer-events-none animate-sparkle"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDelay: `${sparkle.delay}s`,
              }}
            >
              {["✨", "⭐", "🌟", "💫"][sparkle.id % 4]}
            </div>
          ))}

        {/* Pokemon in the center */}
        <div
          ref={pokemonRef}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${getExpressionClass()}`}
        >
          <div className="relative">
            {/* Speech bubble */}
            <div
              className={`absolute -top-16 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-lg whitespace-nowrap transition-all duration-300 ${
                isCelebrating ? "scale-125" : ""
              }`}
            >
              <span className="text-2xl font-bold">
                {getMoodEmoji()} {getMoodText()}
              </span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            </div>

            {/* Pokemon image */}
            <div
              className={`bg-white/50 rounded-full p-4 shadow-xl ${
                isCelebrating ? "animate-wiggle" : happiness === 0 ? "animate-sad" : ""
              }`}
            >
              <Image
                src={currentPokemon.image}
                alt={currentPokemon.name}
                width={180}
                height={180}
                className={`drop-shadow-lg transition-all duration-300 ${
                  isCelebrating ? "saturate-150" : happiness === 0 ? "saturate-50" : ""
                }`}
                draggable={false}
              />
            </div>

            {/* Pokemon name */}
            <div className="text-center mt-2">
              <span className="bg-white/80 px-4 py-1 rounded-full text-xl font-bold text-gray-700 shadow">
                {currentPokemon.name}
              </span>
            </div>
          </div>
        </div>

        {/* Berries */}
        {berries.map((berry) => (
          <div
            key={berry.id}
            className={`absolute cursor-grab active:cursor-grabbing transition-transform hover:scale-110 ${
              draggedBerry?.id === berry.id ? "opacity-50" : ""
            }`}
            style={{
              left: `${berry.position.x}%`,
              top: `${berry.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseDown={(e) => handleMouseDown(e, berry)}
          >
            <div
              className={`w-20 h-20 bg-gradient-to-br ${
                BERRY_TYPES.find((b) => b.color === berry.color)?.bgClass
              } rounded-full flex items-center justify-center shadow-lg border-4 border-white hover:shadow-xl transition-shadow`}
            >
              <span className="text-4xl drop-shadow">{berry.emoji}</span>
            </div>
          </div>
        ))}

        {/* Dragged Berry (follows cursor) */}
        {draggedBerry && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`w-24 h-24 bg-gradient-to-br ${
                BERRY_TYPES.find((b) => b.color === draggedBerry.color)?.bgClass
              } rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-pulse`}
            >
              <span className="text-5xl drop-shadow">{draggedBerry.emoji}</span>
            </div>
          </div>
        )}

        {/* Celebration overlay */}
        {isCelebrating && (
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/30 to-transparent pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
              <div className="text-6xl font-bold text-white drop-shadow-lg animate-bounce">
                YAY!
              </div>
              <div className="text-4xl mt-2">
                🎉 🎊 ⭐ 🎉 🎊
              </div>
              {personalizedMessage && (
                <div className="text-2xl mt-4 bg-white/90 px-6 py-2 rounded-full shadow-lg text-gray-800 font-bold">
                  {personalizedMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions (shown when no berries fed yet) */}
        {happiness === 0 && !isCelebrating && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-3 rounded-2xl shadow-lg">
            <p className="text-lg font-bold text-gray-700 text-center">
              {playerName}, drag berries to feed {currentPokemon.name}!
            </p>
          </div>
        )}
      </div>

      {/* Berry Legend */}
      <div className="mt-4 text-center">
        <p className="text-gray-600 mb-2">Berries to feed:</p>
        <div className="flex justify-center gap-3 flex-wrap">
          {BERRY_TYPES.map((berry) => (
            <div
              key={berry.color}
              className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow"
            >
              <span className="text-xl">{berry.emoji}</span>
              <span className="text-sm font-medium text-gray-600">{berry.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1.5);
          }
        }

        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        @keyframes sad {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(5px);
          }
        }

        :global(.animate-float-up) {
          animation: float-up 1s ease-out forwards;
        }

        :global(.animate-sparkle) {
          animation: sparkle 1s ease-in-out infinite;
        }

        :global(.animate-wiggle) {
          animation: wiggle 0.3s ease-in-out infinite;
        }

        :global(.animate-sad) {
          animation: sad 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
