"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes } from "@/data/pokemon";

const typeColors: Record<string, string> = {
  normal: "bg-gray-400",
  fire: "bg-red-500",
  water: "bg-blue-500",
  electric: "bg-yellow-400",
  grass: "bg-green-500",
  ice: "bg-cyan-300",
  fighting: "bg-orange-700",
  poison: "bg-purple-500",
  ground: "bg-amber-600",
  flying: "bg-indigo-300",
  psychic: "bg-pink-500",
  bug: "bg-lime-500",
  rock: "bg-stone-500",
  ghost: "bg-purple-700",
  dragon: "bg-violet-600",
  dark: "bg-gray-700",
  steel: "bg-slate-400",
  fairy: "bg-pink-300",
};

const typeEmojis: Record<string, string> = {
  normal: "⚪",
  fire: "🔥",
  water: "💧",
  electric: "⚡",
  grass: "🌿",
  ice: "❄️",
  fighting: "👊",
  poison: "☠️",
  ground: "🏜️",
  flying: "🦅",
  psychic: "🔮",
  bug: "🐛",
  rock: "🪨",
  ghost: "👻",
  dragon: "🐉",
  dark: "🌙",
  steel: "⚙️",
  fairy: "✨",
};

// Helper to get type color with fallback for any types not in the map
const getTypeColor = (type: string): string => typeColors[type] || "bg-gray-500";
const getTypeEmoji = (type: string): string => typeEmojis[type] || "❓";

export default function QuizPage() {
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const generateQuestion = useCallback(() => {
    const randomPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
    const correctType = randomPokemon.types[0]; // Use primary type

    const wrongTypes = allTypes
      .filter((t) => !randomPokemon.types.includes(t))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [correctType, ...wrongTypes].sort(() => Math.random() - 0.5);

    setCurrentPokemon(randomPokemon);
    setOptions(allOptions);
    setAnswered(false);
    setSelectedAnswer(null);
  }, []);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswer = (type: string) => {
    if (answered) return;

    setSelectedAnswer(type);
    setAnswered(true);
    setQuestionsAnswered((q) => q + 1);

    if (currentPokemon?.types.includes(type)) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    generateQuestion();
  };

  const isCorrectAnswer = (type: string) => currentPokemon?.types.includes(type);

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
        🔥 Type Quiz
      </h1>

      <div className="flex justify-center gap-8 text-xl mb-8">
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Score: <span className="font-bold text-green-600">{score}</span> / {questionsAnswered}
        </span>
        {questionsAnswered > 0 && (
          <span className="bg-white px-6 py-2 rounded-full shadow">
            {Math.round((score / questionsAnswered) * 100)}% correct
          </span>
        )}
      </div>

      {currentPokemon && (
        <div className="max-w-2xl mx-auto">
          {/* Pokemon Display */}
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl text-center">
            <Image
              src={currentPokemon.image}
              alt={currentPokemon.name}
              width={200}
              height={200}
              className="mx-auto mb-4"
            />
            <h2 className="text-3xl font-bold">{currentPokemon.name}</h2>
            <p className="text-xl text-gray-600 mt-2">What type is this Pokemon?</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((type) => {
              const typeColor = getTypeColor(type);
              let buttonStyle = `${typeColor} text-white opacity-90 hover:opacity-100`;

              if (answered) {
                if (isCorrectAnswer(type)) {
                  buttonStyle = `${typeColor} text-white ring-4 ring-green-400 scale-105`;
                } else if (selectedAnswer === type) {
                  buttonStyle = `${typeColor} text-white opacity-50 ring-4 ring-red-500`;
                } else {
                  buttonStyle = `${typeColor} text-white opacity-40`;
                }
              }

              return (
                <button
                  key={type}
                  onClick={() => handleAnswer(type)}
                  disabled={answered}
                  className={`p-6 rounded-2xl font-bold text-2xl transition-all capitalize flex items-center justify-center gap-3 ${buttonStyle}`}
                >
                  <span className="text-3xl">{getTypeEmoji(type)}</span>
                  {type}
                </button>
              );
            })}
          </div>

          {/* Result Message */}
          {answered && (
            <div className="text-center mt-8">
              <div
                className={`text-2xl font-bold mb-4 ${
                  isCorrectAnswer(selectedAnswer!) ? "text-green-600" : "text-red-500"
                }`}
              >
                {isCorrectAnswer(selectedAnswer!) ? (
                  <>🎉 Correct! {currentPokemon.name} is a {currentPokemon.types.join("/")} type!</>
                ) : (
                  <>😅 Not quite! {currentPokemon.name} is actually a {currentPokemon.types.join("/")} type!</>
                )}
              </div>
              <button
                onClick={handleNext}
                className="bg-orange-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
              >
                Next Question! →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
