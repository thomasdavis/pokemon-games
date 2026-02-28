"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allGenerations } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Score values for each clue level (descending as more clues are revealed)
const SCORE_VALUES = [100, 80, 60, 40, 20, 10];

// Clue types in order
const CLUE_TYPES = [
  "generation",
  "type",
  "height",
  "weight",
  "stat",
  "silhouette",
] as const;

type ClueType = (typeof CLUE_TYPES)[number];

// Clue labels for display
const CLUE_LABELS: Record<ClueType, string> = {
  generation: "Generation",
  type: "Primary Type",
  height: "Height",
  weight: "Weight",
  stat: "Best Stat",
  silhouette: "Silhouette",
};

// Cache for AI responses
const clueCache = new Map<string, string>();

// Get the highest stat for a Pokemon
function getHighestStat(p: Pokemon): string {
  const stats = {
    HP: p.hp,
    Attack: p.attack,
    Defense: p.defense,
    "Special Attack": p.special_attack,
    "Special Defense": p.special_defense,
    Speed: p.speed,
  };
  const highest = Object.entries(stats).reduce((a, b) =>
    a[1] > b[1] ? a : b
  );
  return highest[0];
}

// Get region name from generation
function getRegionName(generation: string): string {
  const regions: Record<string, string> = {
    I: "Kanto",
    II: "Johto",
    III: "Hoenn",
    IV: "Sinnoh",
    V: "Unova",
    VI: "Kalos",
    VII: "Alola",
    VIII: "Galar",
    IX: "Paldea",
  };
  return regions[generation] || "Pokemon World";
}

// Format height
function formatHeight(decimeters: number): string {
  const meters = decimeters / 10;
  if (meters >= 1) {
    return `${meters.toFixed(1)}m tall`;
  }
  return `${(meters * 100).toFixed(0)}cm tall`;
}

// Format weight
function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  if (kg >= 1) {
    return `${kg.toFixed(1)}kg`;
  }
  return `${(kg * 1000).toFixed(0)}g`;
}

// Get clue data for display
function getClueDisplayData(p: Pokemon, clueType: ClueType): string {
  switch (clueType) {
    case "generation":
      return `Generation ${p.generation} (${getRegionName(p.generation)})`;
    case "type":
      return p.types[0].charAt(0).toUpperCase() + p.types[0].slice(1);
    case "height":
      return formatHeight(p.height);
    case "weight":
      return formatWeight(p.weight);
    case "stat":
      return getHighestStat(p);
    case "silhouette":
      return "Shadow Revealed!";
  }
}

// Clue card component
interface ClueCardProps {
  clueType: ClueType;
  index: number;
  revealed: boolean;
  currentPokemon: Pokemon | null;
  hostText: string | null;
  isLoading: boolean;
  onReveal: () => void;
  score: number;
  disabled: boolean;
}

function ClueCard({
  clueType,
  index,
  revealed,
  currentPokemon,
  hostText,
  isLoading,
  onReveal,
  score,
  disabled,
}: ClueCardProps) {
  const clueColors = [
    "from-purple-500 to-indigo-600",
    "from-blue-500 to-cyan-600",
    "from-green-500 to-emerald-600",
    "from-yellow-500 to-orange-600",
    "from-red-500 to-pink-600",
    "from-gray-600 to-gray-800",
  ];

  return (
    <div
      className={`relative transition-all duration-500 ${
        revealed ? "scale-100" : "hover:scale-105"
      }`}
    >
      <div
        className={`rounded-2xl p-4 shadow-lg ${
          revealed
            ? `bg-gradient-to-br ${clueColors[index]} text-white`
            : "bg-white border-4 border-dashed border-gray-300"
        }`}
      >
        <div className="text-center">
          <div className="text-sm font-bold mb-1 opacity-80">
            Clue #{index + 1}
          </div>
          <div className="font-bold mb-2">{CLUE_LABELS[clueType]}</div>

          {revealed ? (
            <div className="space-y-2">
              {clueType === "silhouette" && currentPokemon ? (
                <div className="relative w-24 h-24 mx-auto">
                  <Image
                    src={currentPokemon.image}
                    alt="Mystery Pokemon"
                    fill
                    className="object-contain brightness-0"
                  />
                </div>
              ) : (
                <div className="text-xl font-bold">
                  {currentPokemon && getClueDisplayData(currentPokemon, clueType)}
                </div>
              )}
              {isLoading ? (
                <div className="text-sm animate-pulse">Thinking...</div>
              ) : (
                hostText && (
                  <div className="text-sm italic mt-2 opacity-90">
                    &ldquo;{hostText}&rdquo;
                  </div>
                )
              )}
            </div>
          ) : (
            <button
              onClick={onReveal}
              disabled={disabled}
              className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${
                disabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 shadow-md hover:shadow-lg"
              }`}
            >
              <div className="text-2xl mb-1">?</div>
              <div className="text-xs">Reveal for {score} pts max</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mystery box visual component
function MysteryBox({ openLevel }: { openLevel: number }) {
  const boxLids = [
    { transform: "translateY(0)", opacity: 1 },
    { transform: "translateY(-5px) rotate(-5deg)", opacity: 0.9 },
    { transform: "translateY(-10px) rotate(-10deg)", opacity: 0.8 },
    { transform: "translateY(-15px) rotate(-15deg)", opacity: 0.7 },
    { transform: "translateY(-20px) rotate(-20deg)", opacity: 0.6 },
    { transform: "translateY(-25px) rotate(-25deg)", opacity: 0.5 },
    { transform: "translateY(-40px) rotate(-45deg)", opacity: 0 },
  ];

  const lidStyle = boxLids[Math.min(openLevel, 6)];
  const glowIntensity = Math.min(openLevel * 15, 100);

  return (
    <div className="relative w-40 h-40 mx-auto mb-6">
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-2xl transition-all duration-500"
        style={{
          background: `radial-gradient(circle, rgba(255,215,0,${glowIntensity / 100}) 0%, transparent 70%)`,
          filter: `blur(${glowIntensity / 5}px)`,
        }}
      />

      {/* Box base */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-b from-amber-600 to-amber-800 rounded-xl shadow-xl">
        <div className="absolute inset-x-4 top-2 bottom-2 bg-gradient-to-b from-amber-500 to-amber-700 rounded-lg" />
        <div className="absolute inset-x-6 top-4 h-2 bg-yellow-400 rounded opacity-50" />
        {/* Question mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black text-yellow-300 drop-shadow-lg">
            ?
          </span>
        </div>
      </div>

      {/* Box lid */}
      <div
        className="absolute top-8 w-full h-16 transition-all duration-500 origin-left"
        style={lidStyle}
      >
        <div className="w-full h-full bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-xl shadow-lg">
          <div className="absolute inset-x-4 top-2 bottom-2 bg-gradient-to-b from-amber-400 to-amber-600 rounded-t-lg" />
          <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b" />
        </div>
      </div>

      {/* Sparkles when opening */}
      {openLevel > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(openLevel * 2)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 40}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MysteryBoxPage() {
  const { name: playerName } = usePlayer();
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [options, setOptions] = useState<Pokemon[]>([]);
  const [revealedClues, setRevealedClues] = useState<Set<number>>(new Set());
  const [hostTexts, setHostTexts] = useState<Map<number, string>>(new Map());
  const [loadingClue, setLoadingClue] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(100);
  const [message, setMessage] = useState("");
  const [personalizedMessage, setPersonalizedMessage] = useState<{
    message: string;
    emoji: string;
  } | null>(null);
  const [streak, setStreak] = useState(0);
  const hasSpokenRef = useRef(false);

  // Generate a new round
  const generateRound = useCallback(() => {
    // Pick random Pokemon
    const shuffled = [...pokemon].sort(() => Math.random() - 0.5);
    const answer = shuffled[0];

    // Get 5 decoys that share at least one attribute with the answer
    const decoys: Pokemon[] = [];
    const pool = shuffled.slice(1);

    // Try to get similar Pokemon for harder gameplay
    for (const p of pool) {
      if (decoys.length >= 5) break;
      // Include if same generation, type, or similar stats
      const sameGen = p.generation === answer.generation;
      const sameType = p.types.some((t) => answer.types.includes(t));
      const similarHeight = Math.abs(p.height - answer.height) < 10;
      if (sameGen || sameType || similarHeight) {
        decoys.push(p);
      }
    }

    // Fill remaining slots with random Pokemon if needed
    while (decoys.length < 5) {
      const randomPokemon = pool[decoys.length + 5];
      if (randomPokemon && !decoys.includes(randomPokemon)) {
        decoys.push(randomPokemon);
      }
    }

    // Shuffle options
    const allOptions = [answer, ...decoys].sort(() => Math.random() - 0.5);

    setCurrentPokemon(answer);
    setOptions(allOptions);
    setRevealedClues(new Set());
    setHostTexts(new Map());
    setLoadingClue(null);
    setGameOver(false);
    setIsCorrect(null);
    setRoundScore(100);
    setMessage("");
    setPersonalizedMessage(null);
    hasSpokenRef.current = false;

    // Welcome message
    setTimeout(() => {
      speak(
        `Welcome ${playerName}! A mystery Pokemon awaits inside the box. Reveal clues to discover who it is!`,
        { rate: 1.0, pitch: 1.1 }
      );
    }, 300);
  }, [playerName]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  // Fetch AI host description for a clue
  const fetchHostText = async (
    clueIndex: number,
    pokemonData: Pokemon
  ): Promise<string> => {
    const clueType = CLUE_TYPES[clueIndex];
    const cacheKey = `${pokemonData.id}-${clueIndex}`;

    // Check cache first
    if (clueCache.has(cacheKey)) {
      return clueCache.get(cacheKey)!;
    }

    // Get clue-specific data
    let clueData: string | number;
    switch (clueType) {
      case "generation":
        clueData = pokemonData.generation;
        break;
      case "type":
        clueData = pokemonData.types[0];
        break;
      case "height":
        clueData = pokemonData.height;
        break;
      case "weight":
        clueData = pokemonData.weight;
        break;
      case "stat":
        clueData = getHighestStat(pokemonData);
        break;
      case "silhouette":
        clueData = "shadow";
        break;
    }

    try {
      const response = await fetch("/api/mystery-host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clueType,
          clueData,
          playerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch host text");
      }

      const data = await response.json();
      const text = data.text;

      // Cache the response
      clueCache.set(cacheKey, text);

      return text;
    } catch (error) {
      console.error("Error fetching host text:", error);
      return "";
    }
  };

  // Handle revealing a clue
  const handleRevealClue = async (index: number) => {
    if (gameOver || revealedClues.has(index) || !currentPokemon) return;

    // Must reveal clues in order
    if (index > 0 && !revealedClues.has(index - 1)) return;

    playSound("ding");

    // Update revealed clues
    const newRevealed = new Set(revealedClues);
    newRevealed.add(index);
    setRevealedClues(newRevealed);

    // Update round score
    const newScore = SCORE_VALUES[index];
    setRoundScore(newScore);

    // Fetch and speak host text
    setLoadingClue(index);
    const hostText = await fetchHostText(index, currentPokemon);
    setHostTexts((prev) => new Map(prev).set(index, hostText));
    setLoadingClue(null);

    // Speak the host text
    if (hostText) {
      speak(hostText, { rate: 1.0, pitch: 1.1 });
    }
  };

  // Handle guess
  const handleGuess = (guess: Pokemon) => {
    if (gameOver || !currentPokemon) return;

    playSound("click");
    setGameOver(true);

    if (guess.id === currentPokemon.id) {
      setIsCorrect(true);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setTotalScore((prev) => prev + roundScore);
      setMessage(`Correct! It's ${currentPokemon.name}!`);

      playSound("success");
      setTimeout(() => playSound("win"), 300);

      if (!hasSpokenRef.current) {
        hasSpokenRef.current = true;
        setTimeout(() => {
          speak(`Yes! It's ${currentPokemon.name}! You earned ${roundScore} points!`, {
            rate: 1.1,
            pitch: 1.2,
          });
        }, 500);
      }

      if (newStreak >= 3 && newStreak % 3 === 0) {
        const streakMsg = getQuickPersonalizedMessage(playerName, "streak", {
          streak: newStreak,
        });
        setPersonalizedMessage(streakMsg);
      } else {
        const correctMsg = getQuickPersonalizedMessage(playerName, "won_game", {
          score: roundScore,
        });
        setPersonalizedMessage(correctMsg);
      }
    } else {
      setIsCorrect(false);
      setStreak(0);
      setMessage(`Not quite! It was ${currentPokemon.name}!`);

      playSound("error");

      if (!hasSpokenRef.current) {
        hasSpokenRef.current = true;
        setTimeout(() => {
          speak(`Oh no! The mystery Pokemon was ${currentPokemon.name}! Better luck next time!`, {
            rate: 0.9,
            pitch: 1.0,
          });
        }, 500);
      }

      const wrongMsg = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setPersonalizedMessage(wrongMsg);
    }
  };

  const handleNext = () => {
    generateRound();
  };

  const currentClueIndex = revealedClues.size;

  return (
    <div className="py-8 min-h-screen">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg font-semibold text-yellow-800 shadow">
          Player: {playerName}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-center text-amber-600 mb-2">
        PokeMystery Box
      </h1>
      <p className="text-center text-gray-600 mb-6 text-lg">Clue Ladder</p>

      {/* Score Display */}
      <div className="flex justify-center gap-4 text-lg mb-6 flex-wrap">
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Total: <span className="font-bold text-amber-600">{totalScore}</span>
        </span>
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Round: <span className="font-bold text-green-600">{roundScore}</span>{" "}
          pts
        </span>
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Streak: <span className="font-bold text-orange-500">{streak}</span>{" "}
        </span>
      </div>

      {currentPokemon && (
        <div className="max-w-4xl mx-auto px-4">
          {/* Mystery Box Visual */}
          <MysteryBox openLevel={revealedClues.size} />

          {/* Score Meter */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Potential Score</span>
              <span className="font-bold text-lg text-green-600">
                {roundScore} pts
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                style={{ width: `${roundScore}%` }}
              />
            </div>
          </div>

          {/* Clue Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {CLUE_TYPES.map((clueType, index) => (
              <ClueCard
                key={clueType}
                clueType={clueType}
                index={index}
                revealed={revealedClues.has(index)}
                currentPokemon={currentPokemon}
                hostText={hostTexts.get(index) || null}
                isLoading={loadingClue === index}
                onReveal={() => handleRevealClue(index)}
                score={SCORE_VALUES[index]}
                disabled={
                  gameOver ||
                  (index > 0 && !revealedClues.has(index - 1))
                }
              />
            ))}
          </div>

          {/* Result Message */}
          {message && (
            <div
              className={`text-center text-3xl font-bold mb-4 ${
                isCorrect ? "text-green-600" : "text-red-500"
              } animate-bounce`}
            >
              {message}
            </div>
          )}

          {/* Personalized Message */}
          {personalizedMessage && (
            <div className="text-center text-xl mb-6">
              <span className="bg-gradient-to-r from-amber-100 to-yellow-100 px-6 py-2 rounded-full shadow-md inline-block">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Revealed Pokemon on game over */}
          {gameOver && (
            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl">
                <div className="relative w-48 h-48 mx-auto mb-2">
                  <Image
                    src={currentPokemon.image}
                    alt={currentPokemon.name}
                    fill
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <div className="text-2xl font-bold text-white">
                  {currentPokemon.name}
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  {currentPokemon.types.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-white/30 rounded-full text-sm font-semibold text-white capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Guess Panel */}
          {!gameOver && (
            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-center text-gray-700 mb-4">
                Make Your Guess!{" "}
                {currentClueIndex === 0 && "(or reveal clues first)"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGuess(option)}
                    className="p-4 rounded-2xl font-bold text-lg transition-all bg-gradient-to-br from-gray-50 to-gray-100 hover:from-amber-50 hover:to-orange-50 shadow-md hover:shadow-lg border-2 border-transparent hover:border-amber-400 flex items-center gap-3"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={option.image}
                        alt={option.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-left">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Button */}
          {gameOver && (
            <div className="text-center mt-8">
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-12 py-4 rounded-full font-bold text-2xl hover:from-amber-600 hover:to-orange-700 transition-all hover:scale-105 shadow-lg"
              >
                Next Mystery!
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
