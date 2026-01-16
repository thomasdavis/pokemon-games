"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, celebrateWin, announceScore } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

interface Card {
  id: number;
  pokemonId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

const DIFFICULTY_SETTINGS = {
  easy: { pairs: 4, label: "Easy (4 pairs)" },
  medium: { pairs: 6, label: "Medium (6 pairs)" },
  hard: { pairs: 8, label: "Hard (8 pairs)" },
};

type Difficulty = keyof typeof DIFFICULTY_SETTINGS;

export default function MemoryPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [matchMessage, setMatchMessage] = useState<{ message: string; emoji: string } | null>(null);
  const consecutiveMatches = useRef(0);

  const { name: playerName } = usePlayer();

  const initializeGame = useCallback(() => {
    const numPairs = DIFFICULTY_SETTINGS[difficulty].pairs;
    const shuffledPokemon = [...pokemon].sort(() => Math.random() - 0.5).slice(0, numPairs);

    const gameCards: Card[] = [];
    shuffledPokemon.forEach((p, index) => {
      gameCards.push({ id: index * 2, pokemonId: p.id, isFlipped: false, isMatched: false });
      gameCards.push({ id: index * 2 + 1, pokemonId: p.id, isFlipped: false, isMatched: false });
    });

    setCards(gameCards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMoves(0);
    setGameWon(false);
    setIsChecking(false);
    setMatchMessage(null);
    consecutiveMatches.current = 0;
  }, [difficulty]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleCardClick = (cardId: number) => {
    if (isChecking) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // Play card flip sound
    playSound('card_flip', { volume: 0.5 });

    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsChecking(true);

      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find((c) => c.id === firstId)!;
      const secondCard = newCards.find((c) => c.id === secondId)!;

      if (firstCard.pokemonId === secondCard.pokemonId) {
        // Match found!
        consecutiveMatches.current += 1;

        // Play combo sound for consecutive matches, otherwise regular match sound
        if (consecutiveMatches.current > 1) {
          playSound('combo');
        } else {
          playSound('match');
        }

        // Speak and show personalized message
        speak("Match!");
        const personalizedMsg = getQuickPersonalizedMessage(playerName, 'found_match');
        setMatchMessage(personalizedMsg);

        // Clear message after a delay
        setTimeout(() => setMatchMessage(null), 2000);

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.pokemonId === firstCard.pokemonId ? { ...c, isMatched: true } : c
            )
          );
          setFlippedCards([]);
          setIsChecking(false);

          // Check for win
          const allMatched = newCards.every(
            (c) => c.isMatched || c.pokemonId === firstCard.pokemonId
          );
          if (allMatched) {
            setGameWon(true);
            // Play win sound and celebrate
            playSound('win');
            celebrateWin();
            // Announce the final score
            setTimeout(() => {
              announceScore(moves + 1); // +1 because moves state hasn't updated yet
            }, 2000);
          }
        }, 500);
      } else {
        // No match - flip back, reset consecutive matches
        consecutiveMatches.current = 0;
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  const gridCols = difficulty === "easy" ? "grid-cols-4" : difficulty === "medium" ? "grid-cols-4" : "grid-cols-4";

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-purple-600 mb-4">
        Memory Match
      </h1>

      {/* Player greeting */}
      <p className="text-center text-lg text-gray-600 mb-4">
        Good luck, <span className="font-bold text-purple-600">{playerName}</span>!
      </p>

      {/* Match message popup */}
      {matchMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-yellow-400 text-gray-800 px-6 py-3 rounded-full shadow-lg font-bold text-xl">
            {matchMessage.emoji} {matchMessage.message}
          </div>
        </div>
      )}

      <div className="text-center mb-6 space-y-4">
        <div className="flex justify-center gap-4 flex-wrap">
          {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                difficulty === d
                  ? "bg-purple-600 text-white scale-110"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {DIFFICULTY_SETTINGS[d].label}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-8 text-xl">
          <span className="bg-white px-4 py-2 rounded-full shadow">
            Moves: <span className="font-bold text-purple-600">{moves}</span>
          </span>
          <button
            onClick={initializeGame}
            className="bg-green-500 text-white px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-colors"
          >
            New Game
          </button>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-3 max-w-xl mx-auto`}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="card-flip aspect-square cursor-pointer"
            onClick={() => handleCardClick(card.id)}
          >
            <div
              className={`card-flip-inner w-full h-full ${
                card.isFlipped || card.isMatched ? "flipped" : ""
              }`}
            >
              {/* Card Back */}
              <div className="card-front absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                <span className="text-5xl">❓</span>
              </div>

              {/* Card Front */}
              <div
                className={`card-back absolute inset-0 bg-white rounded-2xl flex items-center justify-center shadow-lg border-4 ${
                  card.isMatched ? "border-green-500 bg-green-100" : "border-yellow-400"
                }`}
              >
                <Image
                  src={`/pokemon/${card.pokemonId}.png`}
                  alt=""
                  width={80}
                  height={80}
                  className={card.isMatched ? "animate-bounce-slow" : ""}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-purple-600 mb-2">
              {playerName} Wins!
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Amazing job, {playerName}! You found all matches in <span className="font-bold">{moves}</span> moves!
            </p>
            <button
              onClick={initializeGame}
              className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-purple-700 transition-colors"
            >
              Play Again!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
