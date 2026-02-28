"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes, allGenerations } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";

// Question categories
interface QuestionButton {
  id: string;
  label: string;
  category: "generation" | "type" | "size" | "legendary" | "evolution";
  getValue: (p: Pokemon) => boolean;
  param?: string;
}

// Generate all question buttons
const generateQuestions = (): QuestionButton[] => {
  const questions: QuestionButton[] = [];

  // Generation questions (I through IX)
  allGenerations.forEach((gen) => {
    questions.push({
      id: `gen-${gen}`,
      label: `Is it from Gen ${gen}?`,
      category: "generation",
      getValue: (p: Pokemon) => p.generation === gen,
      param: gen,
    });
  });

  // Type questions
  allTypes.forEach((type) => {
    questions.push({
      id: `type-${type}`,
      label: `Is it a ${type.charAt(0).toUpperCase() + type.slice(1)} type?`,
      category: "type",
      getValue: (p: Pokemon) => p.types.includes(type),
      param: type,
    });
  });

  // Size questions
  questions.push({
    id: "height-tall",
    label: "Is it taller than 1 meter?",
    category: "size",
    getValue: (p: Pokemon) => p.height >= 10, // height is in decimeters
  });

  questions.push({
    id: "weight-heavy",
    label: "Is it heavier than 50kg?",
    category: "size",
    getValue: (p: Pokemon) => p.weight >= 500, // weight is in hectograms
  });

  // Legendary/Mythical question
  questions.push({
    id: "legendary",
    label: "Is it legendary or mythical?",
    category: "legendary",
    getValue: (p: Pokemon) => p.is_legendary || p.is_mythical,
  });

  // Evolution question
  questions.push({
    id: "evolves",
    label: "Does it evolve?",
    category: "evolution",
    getValue: (p: Pokemon) => p.evolution_chain_id !== null && pokemon.some(
      (other) => other.evolves_from === p.name || p.evolves_from !== null
    ),
  });

  return questions;
};

const ALL_QUESTIONS = generateQuestions();

// Group questions by category for display
const QUESTION_CATEGORIES = {
  generation: { label: "Generation", icon: "📜" },
  type: { label: "Type", icon: "⚡" },
  size: { label: "Size", icon: "📏" },
  legendary: { label: "Special", icon: "✨" },
  evolution: { label: "Evolution", icon: "🔄" },
};

interface ChatMessage {
  id: string;
  type: "question" | "oracle";
  content: string;
}

// Get 6 random Pokemon options including the correct one
function getGuessOptions(correct: Pokemon): Pokemon[] {
  const others = pokemon.filter((p) => p.id !== correct.id);
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 5);
  const options = [correct, ...shuffled].sort(() => Math.random() - 0.5);
  return options;
}

export default function PokeOraclePage() {
  const { name: playerName } = usePlayer();
  const [targetPokemon, setTargetPokemon] = useState<Pokemon | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuessPanel, setShowGuessPanel] = useState(false);
  const [guessOptions, setGuessOptions] = useState<Pokemon[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Start a new game
  const startNewGame = useCallback(() => {
    const randomPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
    setTargetPokemon(randomPokemon);
    setUsedQuestions(new Set());
    setChatMessages([
      {
        id: "welcome",
        type: "oracle",
        content: `Greetings, ${playerName}! I am the PokéOracle. A mysterious Pokemon hides in my crystal ball. Ask me questions to discover its identity!`,
      },
    ]);
    setQuestionsAsked(0);
    setIsLoading(false);
    setShowGuessPanel(false);
    setGuessOptions([]);
    setGameOver(false);
    setWon(false);
    setExpandedCategory(null);

    // Speak the welcome
    setTimeout(() => {
      speak(`Greetings, ${playerName}! I am the PokéOracle. A mysterious Pokemon hides in my crystal ball.`, {
        rate: 0.85,
        pitch: 0.9,
      });
    }, 300);
  }, [playerName]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle asking a question
  const handleAskQuestion = async (question: QuestionButton) => {
    if (!targetPokemon || isLoading || usedQuestions.has(question.id)) return;

    // Play ding sound
    playSound("ding");

    // Add question to chat
    const questionId = `q-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      { id: questionId, type: "question", content: question.label },
    ]);

    // Mark question as used
    setUsedQuestions((prev) => new Set([...prev, question.id]));
    setQuestionsAsked((prev) => prev + 1);
    setIsLoading(true);

    // Get the truth value
    const truthValue = question.getValue(targetPokemon);

    // Build traits context (without revealing name)
    const pokemonTraits = {
      types: targetPokemon.types,
      generation: targetPokemon.generation,
      heightMeters: (targetPokemon.height / 10).toFixed(1),
      weightKg: (targetPokemon.weight / 10).toFixed(1),
      isLegendary: targetPokemon.is_legendary,
      isMythical: targetPokemon.is_mythical,
    };

    try {
      const response = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.label,
          truthValue,
          pokemonTraits,
          playerName,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Play whoosh and add oracle response
      playSound("whoosh");

      const oracleId = `o-${Date.now()}`;
      setChatMessages((prev) => [
        ...prev,
        { id: oracleId, type: "oracle", content: data.text },
      ]);

      // Speak the oracle's response
      speak(data.text, { rate: 0.85, pitch: 0.9 });
    } catch (error) {
      console.error("Oracle error:", error);
      // Fallback response
      const fallbackResponse = truthValue
        ? "The mists swirl with affirmation... The spirits nod in agreement!"
        : "The crystal ball grows dim... The signs point elsewhere, young trainer.";

      playSound("whoosh");

      const oracleId = `o-${Date.now()}`;
      setChatMessages((prev) => [
        ...prev,
        { id: oracleId, type: "oracle", content: fallbackResponse },
      ]);

      speak(fallbackResponse, { rate: 0.85, pitch: 0.9 });
    }

    setIsLoading(false);
  };

  // Show guess panel
  const handleShowGuess = () => {
    if (!targetPokemon) return;

    playSound("powerup");
    setGuessOptions(getGuessOptions(targetPokemon));
    setShowGuessPanel(true);

    speak("The moment of truth has arrived! Make your guess, young trainer!", {
      rate: 0.9,
      pitch: 1.0,
    });
  };

  // Handle making a guess
  const handleGuess = (guessedPokemon: Pokemon) => {
    if (!targetPokemon || gameOver) return;

    playSound("click");
    setGameOver(true);

    if (guessedPokemon.id === targetPokemon.id) {
      setWon(true);
      playSound("win");
      speak(`Incredible, ${playerName}! You have divined the truth! It was ${targetPokemon.name}!`, {
        rate: 1.0,
        pitch: 1.2,
      });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `result-${Date.now()}`,
          type: "oracle",
          content: `Marvelous, ${playerName}! Your wisdom is extraordinary! The hidden Pokemon was indeed ${targetPokemon.name}!`,
        },
      ]);
    } else {
      setWon(false);
      playSound("lose");
      speak(`Alas, the spirits were ${guessedPokemon.name}, but the truth was ${targetPokemon.name}.`, {
        rate: 0.9,
        pitch: 0.9,
      });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `result-${Date.now()}`,
          type: "oracle",
          content: `The mists clear to reveal... ${targetPokemon.name}! A valiant effort, ${playerName}. The Oracle awaits your next challenge!`,
        },
      ]);
    }
  };

  // Get questions for a category
  const getQuestionsForCategory = (category: string) => {
    return ALL_QUESTIONS.filter((q) => q.category === category);
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div className="py-8 min-h-screen">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="bg-purple-100 px-4 py-2 rounded-full text-lg font-semibold text-purple-800 shadow">
          Seeker: {playerName}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-center text-purple-600 mb-2">
        PokeOracle: The Riddle Professor
      </h1>
      <p className="text-center text-gray-600 mb-6 text-lg">
        Ask questions to divine the hidden Pokemon
      </p>

      {/* Stats Bar */}
      <div className="flex justify-center gap-6 text-lg mb-6 flex-wrap">
        <span className="bg-white px-5 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">❓</span>
          Questions: <span className="font-bold text-purple-600">{questionsAsked}</span>
        </span>
        {questionsAsked >= 5 && !showGuessPanel && !gameOver && (
          <button
            onClick={handleShowGuess}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-all animate-pulse"
          >
            Make Your Guess!
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Oracle Avatar & Chat */}
        <div className="bg-gradient-to-b from-purple-900 to-indigo-900 rounded-3xl p-6 shadow-xl">
          {/* Oracle Avatar */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-5xl shadow-lg border-4 border-purple-300">
                🔮
              </div>
              {isLoading && (
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
              )}
            </div>
          </div>
          <h2 className="text-center text-white font-bold text-xl mb-4">The PokéOracle</h2>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="h-64 overflow-y-auto space-y-3 mb-4 pr-2"
            style={{ scrollBehavior: "smooth" }}
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl ${
                  msg.type === "oracle"
                    ? "bg-purple-700/50 text-purple-100 mr-4"
                    : "bg-white/90 text-purple-900 ml-4"
                }`}
              >
                {msg.type === "oracle" && <span className="mr-2">🔮</span>}
                {msg.type === "question" && <span className="mr-2">❓</span>}
                <span className="text-sm">{msg.content}</span>
              </div>
            ))}
            {isLoading && (
              <div className="bg-purple-700/50 text-purple-100 p-3 rounded-2xl mr-4">
                <span className="mr-2">🔮</span>
                <span className="text-sm animate-pulse">The Oracle peers into the mists...</span>
              </div>
            )}
          </div>
        </div>

        {/* Question Panel or Guess Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-xl">
          {showGuessPanel && !gameOver ? (
            <>
              <h2 className="text-xl font-bold text-purple-800 mb-4 text-center">
                Who is the Hidden Pokemon?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {guessOptions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleGuess(p)}
                    className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 hover:border-purple-400 transition-all hover:scale-105 flex flex-col items-center gap-2"
                  >
                    <div className="relative w-16 h-16">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-bold text-purple-800">{p.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowGuessPanel(false)}
                className="w-full mt-4 py-2 text-purple-600 hover:text-purple-800 transition-colors"
              >
                ← Back to Questions
              </button>
            </>
          ) : gameOver ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">{won ? "🎉" : "😮"}</div>
              <h2 className={`text-2xl font-bold mb-4 ${won ? "text-green-600" : "text-purple-600"}`}>
                {won ? "You Got It!" : "So Close!"}
              </h2>
              {targetPokemon && (
                <div className="mb-6">
                  <div className="relative w-32 h-32 mx-auto mb-2">
                    <Image
                      src={targetPokemon.image}
                      alt={targetPokemon.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xl font-bold text-gray-800">{targetPokemon.name}</p>
                  <p className="text-gray-600">
                    {targetPokemon.types.join(" / ")} • Gen {targetPokemon.generation}
                  </p>
                </div>
              )}
              <button
                onClick={startNewGame}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:from-purple-600 hover:to-indigo-700 transition-all hover:scale-105 shadow-lg"
              >
                Consult the Oracle Again
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-purple-800 mb-4 text-center">
                Ask the Oracle
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {Object.entries(QUESTION_CATEGORIES).map(([category, { label, icon }]) => (
                  <div key={category} className="border border-purple-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 flex items-center justify-between font-semibold text-purple-800"
                    >
                      <span>
                        {icon} {label}
                      </span>
                      <span className="text-lg">{expandedCategory === category ? "▼" : "▶"}</span>
                    </button>
                    {expandedCategory === category && (
                      <div className="p-2 bg-white grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {getQuestionsForCategory(category).map((question) => {
                          const isUsed = usedQuestions.has(question.id);
                          return (
                            <button
                              key={question.id}
                              onClick={() => handleAskQuestion(question)}
                              disabled={isUsed || isLoading}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                isUsed
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-purple-100 text-purple-800 hover:bg-purple-200 hover:scale-102"
                              }`}
                            >
                              {question.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {questionsAsked >= 5 && (
                <div className="mt-4 text-center">
                  <p className="text-purple-600 text-sm mb-2">Ready to guess?</p>
                  <button
                    onClick={handleShowGuess}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-all"
                  >
                    Make Your Guess!
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <p className="text-purple-800">
            <span className="font-bold">How to Play:</span> Click question buttons to ask the Oracle.
            The Oracle speaks in riddles but always tells the truth! After 5+ questions, you can make your guess.
          </p>
        </div>
      </div>
    </div>
  );
}
