"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Hand types for the poker game
type HandType = "power_surge" | "balanced" | "total_power";

interface CardState {
  pokemon: Pokemon;
  isFlipped: boolean;
  isHeld: boolean;
  isNew: boolean;
}

interface HandResult {
  type: HandType;
  value: number;
  description: string;
}

// Calculate stats variance (lower = more balanced)
function calculateVariance(p: Pokemon): number {
  const stats = [p.hp, p.attack, p.defense, p.special_attack, p.special_defense, p.speed];
  const mean = stats.reduce((a, b) => a + b, 0) / stats.length;
  const variance = stats.reduce((sum, stat) => sum + Math.pow(stat - mean, 2), 0) / stats.length;
  return variance;
}

// Get the highest single stat
function getHighestStat(p: Pokemon): { stat: string; value: number } {
  const stats = {
    HP: p.hp,
    Attack: p.attack,
    Defense: p.defense,
    "Sp. Atk": p.special_attack,
    "Sp. Def": p.special_defense,
    Speed: p.speed,
  };
  const entries = Object.entries(stats);
  const highest = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
  return { stat: highest[0], value: highest[1] };
}

// Get total stats
function getTotalStats(p: Pokemon): number {
  return p.hp + p.attack + p.defense + p.special_attack + p.special_defense + p.speed;
}

// Evaluate a hand of Pokemon
function evaluateHand(cards: CardState[], handType: HandType): HandResult {
  switch (handType) {
    case "power_surge": {
      // Best single stat across all cards
      let bestStat = { stat: "", value: 0 };
      cards.forEach((card) => {
        const highest = getHighestStat(card.pokemon);
        if (highest.value > bestStat.value) {
          bestStat = highest;
        }
      });
      return {
        type: "power_surge",
        value: bestStat.value,
        description: `Power Surge: ${bestStat.value} ${bestStat.stat}`,
      };
    }
    case "balanced": {
      // Average variance (lower is better, so we invert for scoring)
      const avgVariance = cards.reduce((sum, card) => sum + calculateVariance(card.pokemon), 0) / cards.length;
      // Invert: lower variance = higher score (max variance around 3000, so 3000 - variance)
      const score = Math.max(0, 3000 - avgVariance);
      return {
        type: "balanced",
        value: score,
        description: `Balanced: ${Math.round(score)} harmony`,
      };
    }
    case "total_power": {
      // Sum of all stats across all cards
      const total = cards.reduce((sum, card) => sum + getTotalStats(card.pokemon), 0);
      return {
        type: "total_power",
        value: total,
        description: `Total Power: ${total} combined`,
      };
    }
  }
}

// Simple AI decision making
function aiDecideHolds(cards: CardState[], handType: HandType): boolean[] {
  const holds = cards.map(() => false);

  switch (handType) {
    case "power_surge": {
      // Keep cards with highest individual stats
      const statsWithIndex = cards.map((card, idx) => ({
        idx,
        value: getHighestStat(card.pokemon).value,
      }));
      statsWithIndex.sort((a, b) => b.value - a.value);
      // Hold the top 2 cards
      holds[statsWithIndex[0].idx] = true;
      if (statsWithIndex.length > 1) holds[statsWithIndex[1].idx] = true;
      break;
    }
    case "balanced": {
      // Keep cards with lowest variance
      const varianceWithIndex = cards.map((card, idx) => ({
        idx,
        variance: calculateVariance(card.pokemon),
      }));
      varianceWithIndex.sort((a, b) => a.variance - b.variance);
      // Hold the most balanced cards
      holds[varianceWithIndex[0].idx] = true;
      if (varianceWithIndex.length > 1) holds[varianceWithIndex[1].idx] = true;
      break;
    }
    case "total_power": {
      // Keep cards with highest total stats
      const totalsWithIndex = cards.map((card, idx) => ({
        idx,
        total: getTotalStats(card.pokemon),
      }));
      totalsWithIndex.sort((a, b) => b.total - a.total);
      // Hold the top 2 cards
      holds[totalsWithIndex[0].idx] = true;
      if (totalsWithIndex.length > 1) holds[totalsWithIndex[1].idx] = true;
      break;
    }
  }

  return holds;
}

// Get random Pokemon for cards
function getRandomPokemon(count: number, exclude: number[] = []): Pokemon[] {
  const available = pokemon.filter((p) => !exclude.includes(p.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Hand type display info
const HAND_TYPES: { type: HandType; label: string; description: string; icon: string }[] = [
  { type: "power_surge", label: "Power Surge", description: "Highest single stat wins", icon: "⚡" },
  { type: "balanced", label: "Balanced", description: "Most balanced stats wins", icon: "⚖️" },
  { type: "total_power", label: "Total Power", description: "Highest combined stats wins", icon: "💪" },
];

type GamePhase = "betting" | "dealing" | "player_turn" | "ai_turn" | "showdown" | "result";

export default function StatPokerPage() {
  const [chips, setChips] = useState(100);
  const [bet, setBet] = useState(10);
  const [playerCards, setPlayerCards] = useState<CardState[]>([]);
  const [dealerCards, setDealerCards] = useState<CardState[]>([]);
  const [handType, setHandType] = useState<HandType>("power_surge");
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [result, setResult] = useState<{ winner: "player" | "dealer" | "tie"; message: string } | null>(null);
  const [dealerTaunt, setDealerTaunt] = useState("");
  const [personalizedMessage, setPersonalizedMessage] = useState<{ message: string; emoji: string } | null>(null);

  const usedPokemonIds = useRef<number[]>([]);
  const { name: playerName } = usePlayer();

  // Dealer taunts
  const dealerTaunts = [
    "Think you can beat the house?",
    "Let's see what you've got!",
    "The odds are in my favor...",
    "Feeling lucky, trainer?",
    "May the best Pokemon win!",
    "I've got a good feeling about this hand...",
  ];

  const getDealerTaunt = useCallback(() => {
    return dealerTaunts[Math.floor(Math.random() * dealerTaunts.length)];
  }, []);

  // Deal cards with animation
  const dealCards = useCallback(async () => {
    setPhase("dealing");
    usedPokemonIds.current = [];

    // Get 6 random Pokemon (3 for player, 3 for dealer)
    const allCards = getRandomPokemon(6);
    usedPokemonIds.current = allCards.map((p) => p.id);

    const playerPokemon = allCards.slice(0, 3);
    const dealerPokemon = allCards.slice(3, 6);

    // Initialize cards face down
    setPlayerCards(playerPokemon.map((p) => ({ pokemon: p, isFlipped: false, isHeld: false, isNew: false })));
    setDealerCards(dealerPokemon.map((p) => ({ pokemon: p, isFlipped: false, isHeld: false, isNew: false })));

    // Flip player cards one by one
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound("card_flip", { volume: 0.5 });
      setPlayerCards((prev) =>
        prev.map((card, idx) => (idx === i ? { ...card, isFlipped: true } : card))
      );
    }

    // Announce hand type
    await new Promise((resolve) => setTimeout(resolve, 500));
    const currentHandType = HAND_TYPES.find((h) => h.type === handType);
    speak(`${currentHandType?.label}! ${currentHandType?.description}`);
    setDealerTaunt(getDealerTaunt());

    setPhase("player_turn");
  }, [handType, getDealerTaunt]);

  // Toggle card hold
  const toggleHold = (index: number) => {
    if (phase !== "player_turn") return;
    playSound("click", { volume: 0.4 });
    setPlayerCards((prev) =>
      prev.map((card, idx) => (idx === index ? { ...card, isHeld: !card.isHeld } : card))
    );
  };

  // Draw new cards for non-held cards
  const drawCards = useCallback(async () => {
    setPhase("ai_turn");

    // Replace player's non-held cards
    const nonHeldIndices = playerCards
      .map((card, idx) => (!card.isHeld ? idx : -1))
      .filter((idx) => idx !== -1);

    if (nonHeldIndices.length > 0) {
      const newPokemon = getRandomPokemon(nonHeldIndices.length, usedPokemonIds.current);
      usedPokemonIds.current.push(...newPokemon.map((p) => p.id));

      // Flip cards face down first
      setPlayerCards((prev) =>
        prev.map((card, idx) =>
          nonHeldIndices.includes(idx) ? { ...card, isFlipped: false } : card
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Replace and flip back up
      let newIdx = 0;
      for (const idx of nonHeldIndices) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        playSound("card_flip", { volume: 0.5 });
        setPlayerCards((prev) =>
          prev.map((card, i) =>
            i === idx
              ? { pokemon: newPokemon[newIdx], isFlipped: true, isHeld: false, isNew: true }
              : card
          )
        );
        newIdx++;
      }
    }

    // AI decides which cards to hold
    await new Promise((resolve) => setTimeout(resolve, 500));
    speak("Dealer is thinking...");

    const aiHolds = aiDecideHolds(dealerCards, handType);

    // Show AI holds briefly
    setDealerCards((prev) =>
      prev.map((card, idx) => ({ ...card, isHeld: aiHolds[idx], isFlipped: true }))
    );

    // Flip dealer cards
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound("card_flip", { volume: 0.5 });
      setDealerCards((prev) =>
        prev.map((card, idx) => (idx === i ? { ...card, isFlipped: true } : card))
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Replace dealer's non-held cards
    const dealerNonHeld = aiHolds
      .map((held, idx) => (!held ? idx : -1))
      .filter((idx) => idx !== -1);

    if (dealerNonHeld.length > 0) {
      const newDealerPokemon = getRandomPokemon(dealerNonHeld.length, usedPokemonIds.current);
      usedPokemonIds.current.push(...newDealerPokemon.map((p) => p.id));

      // Flip cards face down
      setDealerCards((prev) =>
        prev.map((card, idx) =>
          dealerNonHeld.includes(idx) ? { ...card, isFlipped: false } : card
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Replace and flip
      let newIdx = 0;
      for (const idx of dealerNonHeld) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        playSound("card_flip", { volume: 0.5 });
        setDealerCards((prev) =>
          prev.map((card, i) =>
            i === idx
              ? { pokemon: newDealerPokemon[newIdx], isFlipped: true, isHeld: false, isNew: true }
              : card
          )
        );
        newIdx++;
      }
    }

    // Showdown
    await new Promise((resolve) => setTimeout(resolve, 800));
    setPhase("showdown");
  }, [playerCards, dealerCards, handType]);

  // Evaluate hands and determine winner
  useEffect(() => {
    if (phase !== "showdown") return;

    const evaluateAndShowResult = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const playerResult = evaluateHand(playerCards, handType);
      const dealerResult = evaluateHand(dealerCards, handType);

      speak(`${playerName}: ${playerResult.description}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      speak(`Dealer: ${dealerResult.description}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let winner: "player" | "dealer" | "tie";
      let message: string;

      if (playerResult.value > dealerResult.value) {
        winner = "player";
        message = `${playerName} wins with ${playerResult.description}!`;
        setChips((prev) => prev + bet);
        playSound("coin", { volume: 0.8 });
        const msg = getQuickPersonalizedMessage(playerName, "won_game", { score: bet });
        setPersonalizedMessage(msg);
        speak(`${playerName} wins!`);
      } else if (dealerResult.value > playerResult.value) {
        winner = "dealer";
        message = `Dealer wins with ${dealerResult.description}!`;
        setChips((prev) => prev - bet);
        playSound("lose", { volume: 0.7 });
        const msg = getQuickPersonalizedMessage(playerName, "lost_game");
        setPersonalizedMessage(msg);
        speak("Dealer wins!");
      } else {
        winner = "tie";
        message = "It's a tie! Bets returned.";
        const msg = { message: "It's a draw!", emoji: "🤝" };
        setPersonalizedMessage(msg);
        speak("It's a tie!");
      }

      setResult({ winner, message });
      setPhase("result");
    };

    evaluateAndShowResult();
  }, [phase, playerCards, dealerCards, handType, playerName, bet]);

  // Reset for new round
  const newRound = () => {
    if (chips <= 0) {
      setChips(100);
      speak("Here's 100 chips to keep playing!");
    }
    setPlayerCards([]);
    setDealerCards([]);
    setResult(null);
    setPersonalizedMessage(null);
    setDealerTaunt("");
    setPhase("betting");
  };

  // Start game
  const startGame = () => {
    if (bet > chips) {
      speak("Not enough chips!");
      return;
    }
    dealCards();
  };

  // Render card
  const renderCard = (card: CardState, index: number, isPlayer: boolean, onClick?: () => void) => {
    const stats = [
      { label: "HP", value: card.pokemon.hp, color: "bg-green-500" },
      { label: "ATK", value: card.pokemon.attack, color: "bg-red-500" },
      { label: "DEF", value: card.pokemon.defense, color: "bg-yellow-600" },
      { label: "SpA", value: card.pokemon.special_attack, color: "bg-blue-500" },
      { label: "SpD", value: card.pokemon.special_defense, color: "bg-purple-500" },
      { label: "SPD", value: card.pokemon.speed, color: "bg-pink-500" },
    ];

    return (
      <div
        key={index}
        className={`relative cursor-pointer transition-all duration-300 ${
          card.isHeld ? "transform -translate-y-4" : ""
        } ${card.isNew ? "animate-pulse" : ""}`}
        onClick={onClick}
      >
        <div
          className={`card-flip w-32 sm:w-40 h-48 sm:h-56 ${card.isFlipped ? "" : ""}`}
        >
          <div
            className={`card-flip-inner w-full h-full ${card.isFlipped ? "flipped" : ""}`}
          >
            {/* Card Back */}
            <div className="card-front absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-xl border-4 border-yellow-400">
              <div className="text-4xl">🎴</div>
            </div>

            {/* Card Front */}
            <div
              className={`card-back absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-xl border-4 ${
                card.isHeld ? "border-green-500 ring-4 ring-green-300" : "border-yellow-400"
              } flex flex-col items-center p-2 overflow-hidden`}
            >
              <div className="text-xs font-bold text-gray-700 truncate w-full text-center">
                {card.pokemon.name}
              </div>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 my-1">
                <Image
                  src={`/pokemon/${card.pokemon.id}.png`}
                  alt={card.pokemon.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="w-full space-y-0.5 text-[10px]">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1">
                    <span className="w-6 text-gray-600 font-medium">{stat.label}</span>
                    <div className="flex-1 bg-gray-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stat.color}`}
                        style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
              {isPlayer && phase === "player_turn" && (
                <div
                  className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded ${
                    card.isHeld ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                  }`}
                >
                  {card.isHeld ? "HOLD" : "TAP"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900 py-4 px-2">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400 drop-shadow-lg mb-1">
          Stat Poker: Dex Casino
        </h1>
        <p className="text-green-200 text-sm">
          Welcome, <span className="font-bold text-yellow-300">{playerName}</span>!
        </p>
      </div>

      {/* Chips Display */}
      <div className="flex justify-center gap-4 mb-4">
        <div className="bg-black/40 backdrop-blur rounded-full px-6 py-2 flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <span className="text-2xl font-bold text-yellow-400">{chips}</span>
          <span className="text-green-200 text-sm">chips</span>
        </div>
        {bet > 0 && phase !== "betting" && (
          <div className="bg-black/40 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
            <span className="text-green-200 text-sm">Bet:</span>
            <span className="text-xl font-bold text-yellow-400">{bet}</span>
          </div>
        )}
      </div>

      {/* Hand Type Selection */}
      {phase === "betting" && (
        <div className="max-w-2xl mx-auto mb-6">
          <h2 className="text-center text-yellow-300 font-bold mb-3">Choose Hand Type:</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {HAND_TYPES.map((ht) => (
              <button
                key={ht.type}
                onClick={() => setHandType(ht.type)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  handType === ht.type
                    ? "bg-yellow-400 text-green-900 scale-110 shadow-lg"
                    : "bg-green-700 text-green-100 hover:bg-green-600"
                }`}
              >
                <span className="mr-1">{ht.icon}</span>
                {ht.label}
              </button>
            ))}
          </div>
          <p className="text-center text-green-200 text-sm mt-2">
            {HAND_TYPES.find((h) => h.type === handType)?.description}
          </p>
        </div>
      )}

      {/* Betting Phase */}
      {phase === "betting" && (
        <div className="max-w-md mx-auto mb-6 bg-black/30 backdrop-blur rounded-xl p-4">
          <h2 className="text-center text-yellow-300 font-bold mb-3">Place Your Bet:</h2>
          <div className="flex justify-center items-center gap-4 mb-4">
            <button
              onClick={() => setBet(Math.max(5, bet - 5))}
              className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full font-bold text-xl"
            >
              -
            </button>
            <div className="bg-green-700 px-8 py-2 rounded-lg">
              <span className="text-3xl font-bold text-yellow-400">{bet}</span>
            </div>
            <button
              onClick={() => setBet(Math.min(chips, bet + 5))}
              className="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-full font-bold text-xl"
            >
              +
            </button>
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {[10, 25, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => setBet(Math.min(chips, amount))}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-1 rounded font-bold text-sm"
              >
                {amount}
              </button>
            ))}
            <button
              onClick={() => setBet(chips)}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-1 rounded font-bold text-sm"
            >
              ALL IN
            </button>
          </div>
          <button
            onClick={startGame}
            disabled={bet > chips || bet <= 0}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-green-900 py-3 rounded-xl font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            DEAL CARDS
          </button>
        </div>
      )}

      {/* Game Area */}
      {phase !== "betting" && (
        <div className="max-w-4xl mx-auto">
          {/* Dealer Area */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🎰</span>
              <h2 className="text-xl font-bold text-red-400">Dealer</h2>
            </div>
            {dealerTaunt && phase === "player_turn" && (
              <p className="text-center text-yellow-300 italic text-sm mb-2">
                &quot;{dealerTaunt}&quot;
              </p>
            )}
            <div className="flex justify-center gap-2 sm:gap-4">
              {dealerCards.map((card, idx) => renderCard(card, idx, false))}
            </div>
          </div>

          {/* Hand Type Indicator */}
          <div className="flex justify-center mb-4">
            <div className="bg-black/50 backdrop-blur px-6 py-2 rounded-full">
              <span className="text-lg text-yellow-300 font-bold">
                {HAND_TYPES.find((h) => h.type === handType)?.icon}{" "}
                {HAND_TYPES.find((h) => h.type === handType)?.label}
              </span>
            </div>
          </div>

          {/* Player Area */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🎮</span>
              <h2 className="text-xl font-bold text-blue-400">{playerName}</h2>
            </div>
            <div className="flex justify-center gap-2 sm:gap-4">
              {playerCards.map((card, idx) =>
                renderCard(card, idx, true, () => toggleHold(idx))
              )}
            </div>
          </div>

          {/* Player Turn Controls */}
          {phase === "player_turn" && (
            <div className="text-center">
              <p className="text-green-200 mb-3">Click cards to hold, then draw new ones!</p>
              <button
                onClick={drawCards}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-bold text-xl shadow-lg transition-all"
              >
                DRAW
              </button>
            </div>
          )}

          {/* AI Turn Indicator */}
          {phase === "ai_turn" && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-black/40 px-6 py-3 rounded-full">
                <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full" />
                <span className="text-yellow-300 font-bold">Dealer is drawing...</span>
              </div>
            </div>
          )}

          {/* Showdown */}
          {phase === "showdown" && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-black/40 px-6 py-3 rounded-full">
                <span className="text-2xl animate-pulse">🎲</span>
                <span className="text-yellow-300 font-bold">Showdown!</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result Modal */}
      {phase === "result" && result && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div
            className={`bg-gradient-to-br ${
              result.winner === "player"
                ? "from-yellow-400 to-yellow-600"
                : result.winner === "dealer"
                ? "from-red-500 to-red-700"
                : "from-gray-400 to-gray-600"
            } rounded-3xl p-8 text-center max-w-md w-full shadow-2xl`}
          >
            <div className="text-6xl mb-4">
              {result.winner === "player" ? "🏆" : result.winner === "dealer" ? "😔" : "🤝"}
            </div>
            <h2
              className={`text-3xl font-bold mb-2 ${
                result.winner === "player" ? "text-green-900" : "text-white"
              }`}
            >
              {result.winner === "player"
                ? `${playerName} Wins!`
                : result.winner === "dealer"
                ? "Dealer Wins"
                : "It's a Tie!"}
            </h2>
            <p
              className={`text-lg mb-4 ${
                result.winner === "player" ? "text-green-800" : "text-white/90"
              }`}
            >
              {result.message}
            </p>
            {personalizedMessage && (
              <p
                className={`text-xl font-bold mb-4 ${
                  result.winner === "player" ? "text-green-900" : "text-white"
                }`}
              >
                {personalizedMessage.emoji} {personalizedMessage.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-2xl">🪙</span>
              <span
                className={`text-2xl font-bold ${
                  result.winner === "player" ? "text-green-900" : "text-white"
                }`}
              >
                {chips} chips
              </span>
              {result.winner === "player" && (
                <span className="text-green-900 font-bold">(+{bet})</span>
              )}
              {result.winner === "dealer" && (
                <span className="text-white font-bold">(-{bet})</span>
              )}
            </div>
            <button
              onClick={newRound}
              className={`px-8 py-3 rounded-xl font-bold text-xl transition-all ${
                result.winner === "player"
                  ? "bg-green-900 text-yellow-400 hover:bg-green-800"
                  : "bg-white text-gray-800 hover:bg-gray-100"
              }`}
            >
              {chips <= 0 ? "Get More Chips" : "Play Again"}
            </button>
          </div>
        </div>
      )}

      {/* Game Out of Chips */}
      {chips <= 0 && phase === "betting" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
            <div className="text-6xl mb-4">😅</div>
            <h2 className="text-3xl font-bold text-white mb-2">Out of Chips!</h2>
            <p className="text-white/90 mb-6">
              Don&apos;t worry, {playerName}! Here are some more chips to keep playing!
            </p>
            <button
              onClick={() => setChips(100)}
              className="bg-yellow-400 text-purple-900 px-8 py-3 rounded-xl font-bold text-xl hover:bg-yellow-300 transition-all"
            >
              Get 100 Free Chips!
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === "betting" && chips > 0 && (
        <div className="max-w-2xl mx-auto mt-8 bg-black/30 backdrop-blur rounded-xl p-4 text-green-200">
          <h3 className="font-bold text-yellow-300 mb-2">How to Play:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Choose a hand type to compete in</li>
            <li>Place your bet and deal cards</li>
            <li>Click cards you want to keep (HOLD)</li>
            <li>Press DRAW to replace non-held cards</li>
            <li>Best hand wins based on the hand type!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
