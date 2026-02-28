"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Difference types and their CSS transformations
type DifferenceType = "mirror" | "hue" | "brightness" | "opacity";

interface Difference {
  type: DifferenceType;
  label: string;
  found: boolean;
  hintX: number;
  hintY: number;
}

interface ClickMarker {
  id: number;
  x: number;
  y: number;
  isCorrect: boolean;
}

const DIFFERENCE_CONFIGS: Record<DifferenceType, { label: string; description: string }> = {
  mirror: { label: "Flipped", description: "The image is mirrored horizontally" },
  hue: { label: "Color Shift", description: "The colors are different" },
  brightness: { label: "Brightness", description: "The brightness is different" },
  opacity: { label: "Faded Area", description: "Part of the image is faded" },
};

// Generate random differences for each round
function generateDifferences(): Difference[] {
  const allTypes: DifferenceType[] = ["mirror", "hue", "brightness", "opacity"];
  const shuffled = [...allTypes].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  return selected.map((type) => ({
    type,
    label: DIFFERENCE_CONFIGS[type].label,
    found: false,
    // Random position for hint circle (as percentage)
    hintX: 20 + Math.random() * 60,
    hintY: 20 + Math.random() * 60,
  }));
}

// Get CSS styles for the modified image based on active differences
function getModifiedStyles(differences: Difference[]): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const filters: string[] = [];

  differences.forEach((diff) => {
    switch (diff.type) {
      case "mirror":
        styles.transform = "scaleX(-1)";
        break;
      case "hue":
        filters.push("hue-rotate(90deg)");
        break;
      case "brightness":
        filters.push("brightness(1.4)");
        break;
      case "opacity":
        // This creates a gradient mask effect
        styles.maskImage = "linear-gradient(135deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0.3) 100%)";
        styles.WebkitMaskImage = "linear-gradient(135deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0.3) 100%)";
        break;
    }
  });

  if (filters.length > 0) {
    styles.filter = filters.join(" ");
  }

  return styles;
}

export default function PokeMirrorPage() {
  const { name: playerName } = usePlayer();

  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([]);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState<DifferenceType | null>(null);
  const [message, setMessage] = useState<{ text: string; emoji: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const markerIdRef = useRef(0);

  // Start a new round
  const startNewRound = useCallback(() => {
    const shuffled = [...pokemon].sort(() => Math.random() - 0.5);
    const selected = shuffled[0];

    setCurrentPokemon(selected);
    setDifferences(generateDifferences());
    setClickMarkers([]);
    setTimer(0);
    setIsPlaying(true);
    setGameComplete(false);
    setShowHint(null);

    speak(`Find the differences, ${playerName}!`);
    playSound("whoosh");
  }, [playerName]);

  // Initialize game
  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    if (isPlaying && !gameComplete) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, gameComplete]);

  // Check for round completion
  useEffect(() => {
    if (differences.length > 0 && differences.every((d) => d.found)) {
      setGameComplete(true);
      setIsPlaying(false);

      // Calculate score: base points - time penalty - hint penalty
      const baseScore = 1000;
      const timePenalty = timer * 2;
      const hintPenalty = hintsUsed * 100;
      const roundScore = Math.max(100, baseScore - timePenalty - hintPenalty);

      setScore((s) => s + roundScore);

      playSound("success");

      const personalizedMsg = getQuickPersonalizedMessage(playerName, "won_game", { score: roundScore });
      setMessage({ text: personalizedMsg.message, emoji: personalizedMsg.emoji });
      speak(`Amazing, ${playerName}! You found all the differences!`);
    }
  }, [differences, timer, hintsUsed, playerName]);

  // Handle click on modified image
  const handleModifiedImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying || gameComplete) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Find the next unfound difference
    const unfoundDiff = differences.find((d) => !d.found);

    if (unfoundDiff) {
      // Mark as found
      setDifferences((prev) =>
        prev.map((d) =>
          d.type === unfoundDiff.type ? { ...d, found: true } : d
        )
      );

      // Add correct marker
      markerIdRef.current += 1;
      setClickMarkers((prev) => [
        ...prev,
        { id: markerIdRef.current, x, y, isCorrect: true },
      ]);

      playSound("pop");

      const remaining = differences.filter((d) => !d.found && d.type !== unfoundDiff.type).length;
      if (remaining > 0) {
        speak(`Found ${unfoundDiff.label}! ${remaining} more to go!`);
      }

      // Hide hint if it was showing for this difference
      if (showHint === unfoundDiff.type) {
        setShowHint(null);
      }
    }
  };

  // Handle click on original image (wrong click)
  const handleOriginalImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying || gameComplete) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add wrong marker
    markerIdRef.current += 1;
    setClickMarkers((prev) => [
      ...prev,
      { id: markerIdRef.current, x, y, isCorrect: false },
    ]);

    playSound("error", { volume: 0.5 });

    // Remove marker after animation
    setTimeout(() => {
      setClickMarkers((prev) =>
        prev.filter((m) => m.id !== markerIdRef.current)
      );
    }, 1000);
  };

  // Use hint
  const useHint = () => {
    if (!isPlaying || gameComplete) return;

    const unfoundDiff = differences.find((d) => !d.found);
    if (unfoundDiff) {
      setShowHint(unfoundDiff.type);
      setHintsUsed((h) => h + 1);
      playSound("ding");
      speak(`Hint: Look for the ${DIFFERENCE_CONFIGS[unfoundDiff.type].description.toLowerCase()}`);

      // Hide hint after 3 seconds
      setTimeout(() => {
        setShowHint(null);
      }, 3000);
    }
  };

  // Start next round
  const nextRound = () => {
    setRound((r) => r + 1);
    setHintsUsed(0);
    setMessage(null);
    startNewRound();
  };

  // Reset game completely
  const resetGame = () => {
    setRound(1);
    setScore(0);
    setHintsUsed(0);
    setMessage(null);
    startNewRound();
  };

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const foundCount = differences.filter((d) => d.found).length;

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
        PokeMirror: Spot the Differences
      </h1>

      {/* Player greeting */}
      <p className="text-center text-lg text-gray-600 mb-6">
        Good luck, <span className="font-bold text-indigo-600">{playerName}</span>!
      </p>

      {/* Message popup */}
      {message && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 px-6 py-3 rounded-full shadow-lg font-bold text-xl">
            {message.emoji} {message.text}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex justify-center gap-4 flex-wrap mb-6">
        <span className="bg-white px-4 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          Round: <span className="font-bold text-indigo-600">{round}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          Time: <span className="font-bold text-indigo-600">{formatTime(timer)}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          Score: <span className="font-bold text-indigo-600">{score}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          Found: <span className="font-bold text-green-600">{foundCount}/3</span>
        </span>
      </div>

      {currentPokemon && (
        <>
          {/* Pokemon Name */}
          <div className="text-center mb-4">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-full font-bold text-xl shadow-lg">
              {currentPokemon.name}
            </span>
          </div>

          {/* Differences to Find */}
          <div className="flex justify-center gap-3 mb-6 flex-wrap">
            {differences.map((diff, index) => (
              <div
                key={diff.type}
                className={`px-4 py-2 rounded-full font-semibold transition-all ${
                  diff.found
                    ? "bg-green-500 text-white scale-105"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {diff.found ? "✓" : `${index + 1}.`} {diff.label}
              </div>
            ))}
          </div>

          {/* Image Comparison Area */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-6">
            {/* Original Image */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-700 mb-2">Original</h3>
              <div
                className="relative bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 shadow-xl cursor-crosshair overflow-hidden"
                onClick={handleOriginalImageClick}
                style={{ width: 280, height: 280 }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={currentPokemon.image}
                    alt={currentPokemon.name}
                    width={220}
                    height={220}
                    className="object-contain drop-shadow-lg"
                    draggable={false}
                  />
                </div>

                {/* Click markers on original */}
                {clickMarkers
                  .filter((m) => !m.isCorrect)
                  .map((marker) => (
                    <div
                      key={marker.id}
                      className="absolute w-8 h-8 -ml-4 -mt-4 pointer-events-none animate-ping"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      <div className="w-full h-full rounded-full border-4 border-red-500 bg-red-500/30" />
                    </div>
                  ))}
              </div>
            </div>

            {/* VS Divider */}
            <div className="text-4xl font-bold text-gray-400">VS</div>

            {/* Modified Image */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-700 mb-2">Spot the Differences!</h3>
              <div
                className="relative bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl p-4 shadow-xl cursor-crosshair overflow-hidden"
                onClick={handleModifiedImageClick}
                style={{ width: 280, height: 280 }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={currentPokemon.image}
                    alt={`${currentPokemon.name} - modified`}
                    width={220}
                    height={220}
                    className="object-contain drop-shadow-lg transition-all duration-300"
                    style={getModifiedStyles(differences)}
                    draggable={false}
                  />
                </div>

                {/* Click markers on modified (correct clicks) */}
                {clickMarkers
                  .filter((m) => m.isCorrect)
                  .map((marker) => (
                    <div
                      key={marker.id}
                      className="absolute w-10 h-10 -ml-5 -mt-5 pointer-events-none"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      <div className="w-full h-full rounded-full border-4 border-green-500 bg-green-500/30 animate-pulse" />
                      <span className="absolute inset-0 flex items-center justify-center text-xl">✓</span>
                    </div>
                  ))}

                {/* Hint circle */}
                {showHint && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-yellow-500 animate-pulse bg-yellow-500/20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            {!gameComplete && (
              <button
                onClick={useHint}
                className="bg-yellow-500 text-white px-6 py-3 rounded-full font-bold hover:bg-yellow-600 transition-all hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span className="text-xl">💡</span>
                Use Hint (-100 pts)
              </button>
            )}

            {gameComplete && (
              <button
                onClick={nextRound}
                className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg animate-bounce"
              >
                Next Round! →
              </button>
            )}

            <button
              onClick={resetGame}
              className="bg-gray-500 text-white px-6 py-3 rounded-full font-bold hover:bg-gray-600 transition-all hover:scale-105 shadow-lg"
            >
              New Game
            </button>
          </div>

          {/* Instructions */}
          {!gameComplete && (
            <div className="max-w-xl mx-auto mt-8 bg-white/80 rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-lg text-gray-700 mb-2 text-center">
                How to Play
              </h3>
              <ul className="text-gray-600 space-y-1 text-center">
                <li>Click on the <span className="font-bold text-purple-600">right image</span> to find differences</li>
                <li>Find all <span className="font-bold text-green-600">3 differences</span> as fast as you can</li>
                <li>Faster time = higher score!</li>
                <li>Hints cost 100 points each</li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* Win Modal */}
      {gameComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl animate-pop">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-indigo-600 mb-2">
              Round {round} Complete!
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Great job, {playerName}! You found all the differences!
            </p>
            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <p className="text-lg">
                Time: <span className="font-bold text-indigo-600">{formatTime(timer)}</span>
              </p>
              <p className="text-lg">
                Hints Used: <span className="font-bold text-yellow-600">{hintsUsed}</span>
              </p>
              <p className="text-xl font-bold mt-2">
                Total Score: <span className="text-green-600">{score}</span>
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={nextRound}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-indigo-700 transition-colors"
              >
                Next Round!
              </button>
              <button
                onClick={resetGame}
                className="bg-gray-300 text-gray-700 px-6 py-3 rounded-full font-bold hover:bg-gray-400 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
