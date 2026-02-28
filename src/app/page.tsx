import Image from "next/image";
import Link from "next/link";

const games = [
  {
    title: "Pokemon Flight",
    description: "Soar through 3D skies with flying Pokemon!",
    href: "/pokemon-flight",
    color: "from-sky-400 to-indigo-700",
    emoji: "🦅",
    pokemonId: 18,
  },
  {
    title: "PokéSense",
    description: "Learn & catch with skill challenges!",
    href: "/poke-sense",
    color: "from-violet-500 to-purple-700",
    emoji: "🎯",
    pokemonId: 25,
  },
  {
    title: "Pokedex",
    description: "Browse all 1008 Pokemon!",
    href: "/pokedex",
    color: "from-blue-400 to-blue-600",
    emoji: "📖",
    pokemonId: 25,
  },
  {
    title: "Catch Pokemon",
    description: "Click to catch floating Pokemon!",
    href: "/catch",
    color: "from-red-400 to-red-600",
    emoji: "🎯",
    pokemonId: 6,
  },
  {
    title: "Bubble Pop",
    description: "Pop Pokemon bubbles before they escape!",
    href: "/bubble-pop",
    color: "from-cyan-400 to-cyan-600",
    emoji: "🫧",
    pokemonId: 7,
  },
  {
    title: "Memory Match",
    description: "Find matching Pokemon pairs!",
    href: "/memory",
    color: "from-purple-400 to-purple-600",
    emoji: "🎴",
    pokemonId: 39,
  },
  {
    title: "Who's That Pokemon?",
    description: "Guess from the shadow!",
    href: "/whos-that-pokemon",
    color: "from-green-400 to-green-600",
    emoji: "❓",
    pokemonId: 150,
  },
  {
    title: "Type Quiz",
    description: "Learn Pokemon types!",
    href: "/quiz",
    color: "from-orange-400 to-orange-600",
    emoji: "🔥",
    pokemonId: 4,
  },
  {
    title: "Evolution Chain",
    description: "Put evolutions in order!",
    href: "/evolution",
    color: "from-violet-400 to-violet-600",
    emoji: "✨",
    pokemonId: 149,
  },
  {
    title: "Feed Pokemon",
    description: "Drag berries to hungry Pokemon!",
    href: "/feed",
    color: "from-pink-400 to-pink-600",
    emoji: "🍎",
    pokemonId: 143,
  },
  {
    title: "Big or Small?",
    description: "Guess the Pokemon's size!",
    href: "/size-sort",
    color: "from-amber-400 to-amber-600",
    emoji: "📏",
    pokemonId: 95,
  },
  {
    title: "PokeBlackout",
    description: "Scratch to reveal & guess!",
    href: "/blackout",
    color: "from-indigo-400 to-indigo-600",
    emoji: "🎰",
    pokemonId: 94,
  },
  {
    title: "Dex Sniper",
    description: "Find the target Pokemon fast!",
    href: "/dex-sniper",
    color: "from-teal-400 to-teal-600",
    emoji: "🔍",
    pokemonId: 130,
  },
  {
    title: "Speed Sort",
    description: "Drag to sort by Speed stat!",
    href: "/speed-sort",
    color: "from-sky-400 to-sky-600",
    emoji: "⚡",
    pokemonId: 135,
  },
  {
    title: "Who Evolves?",
    description: "Find Pokemon that can evolve!",
    href: "/who-evolves",
    color: "from-emerald-400 to-teal-600",
    emoji: "⬆️",
    pokemonId: 133,
  },
  {
    title: "Evolution Order",
    description: "Drag to build evolution chains!",
    href: "/evolution-order",
    color: "from-fuchsia-400 to-fuchsia-600",
    emoji: "🔗",
    pokemonId: 134,
  },
  {
    title: "Dex Timeline",
    description: "Sort Pokemon by generation!",
    href: "/timeline",
    color: "from-indigo-500 to-violet-600",
    emoji: "📅",
    pokemonId: 151,
  },
  {
    title: "Height Duel",
    description: "Which Pokemon is taller?",
    href: "/height-duel",
    color: "from-rose-400 to-rose-600",
    emoji: "📐",
    pokemonId: 131,
  },
  {
    title: "Type Dominance",
    description: "Quick-fire type matchups!",
    href: "/type-dominance",
    color: "from-red-500 to-orange-500",
    emoji: "⚔️",
    pokemonId: 6,
  },
  {
    title: "PokeOracle",
    description: "Ask riddles to guess Pokemon!",
    href: "/poke-oracle",
    color: "from-purple-500 to-indigo-600",
    emoji: "🔮",
    pokemonId: 65,
  },
  {
    title: "Hidden Ability",
    description: "Guess which Pokemon has the power!",
    href: "/hidden-ability",
    color: "from-violet-500 to-purple-600",
    emoji: "💫",
    pokemonId: 150,
  },
  {
    title: "PokéScale",
    description: "Which Pokemon is heavier?",
    href: "/poke-scale",
    color: "from-yellow-400 to-orange-500",
    emoji: "⚖️",
    pokemonId: 143,
  },
  {
    title: "Silhouette",
    description: "Guess from the shadow shape!",
    href: "/silhouette",
    color: "from-gray-600 to-gray-800",
    emoji: "👤",
    pokemonId: 94,
  },
  {
    title: "Who's Missing?",
    description: "Memory test - who disappeared?",
    href: "/whos-missing",
    color: "from-pink-500 to-rose-600",
    emoji: "🕵️",
    pokemonId: 132,
  },
  {
    title: "PokéMirror",
    description: "Spot the differences!",
    href: "/poke-mirror",
    color: "from-cyan-500 to-blue-600",
    emoji: "🪞",
    pokemonId: 137,
  },
  {
    title: "Stat Balance",
    description: "Balance the seesaw with stats!",
    href: "/stat-balance",
    color: "from-lime-400 to-green-600",
    emoji: "⚖️",
    pokemonId: 68,
  },
  {
    title: "Stat Poker",
    description: "Pokemon card showdown!",
    href: "/stat-poker",
    color: "from-emerald-600 to-green-800",
    emoji: "🃏",
    pokemonId: 52,
  },
  {
    title: "PokéDraft",
    description: "Draft your dream team vs AI!",
    href: "/poke-draft",
    color: "from-blue-500 to-indigo-700",
    emoji: "👥",
    pokemonId: 149,
  },
  {
    title: "Mystery Box",
    description: "Clues from the AI host!",
    href: "/mystery-box",
    color: "from-amber-500 to-yellow-600",
    emoji: "📦",
    pokemonId: 35,
  },
  {
    title: "Logic Grid",
    description: "Deduction puzzle with AI hints!",
    href: "/logic-grid",
    color: "from-slate-500 to-slate-700",
    emoji: "🧩",
    pokemonId: 122,
  },
  {
    title: "PokéSudoku",
    description: "Type-based sudoku puzzle!",
    href: "/poke-sudoku",
    color: "from-indigo-400 to-blue-600",
    emoji: "🔢",
    pokemonId: 201,
  },
  {
    title: "Bagon Headbutt",
    description: "Dive & headbutt Pokemon!",
    href: "/bagon-headbutt",
    color: "from-purple-500 to-indigo-600",
    emoji: "💥",
    pokemonId: 371,
  },
  {
    title: "Type Fall",
    description: "Type Pokemon names as they fall!",
    href: "/type-fall",
    color: "from-indigo-400 to-purple-600",
    emoji: "⌨️",
    pokemonId: 151,
  },
  {
    title: "Bubble Type",
    description: "Type to pop Pokemon bubbles!",
    href: "/bubble-type",
    color: "from-cyan-400 to-blue-500",
    emoji: "⌨️",
    pokemonId: 7,
  },
  {
    title: "Letter Drop",
    description: "Catch letters to spell Pokemon!",
    href: "/letter-drop",
    color: "from-amber-400 to-orange-500",
    emoji: "🔤",
    pokemonId: 25,
  },
  {
    title: "Pokemon Mario",
    description: "Platformer adventure with Pokemon!",
    href: "/pokemon-mario",
    color: "from-red-500 to-red-700",
    emoji: "🍄",
    pokemonId: 1,
  },
  {
    title: "Pokemon Math",
    description: "Learn math with Pokemon!",
    href: "/pokemon-math",
    color: "from-green-400 to-emerald-600",
    emoji: "➕",
    pokemonId: 63,
  },
  {
    title: "Pokemon Race",
    description: "Race against Pokemon!",
    href: "/pokemon-race",
    color: "from-yellow-400 to-amber-500",
    emoji: "🏁",
    pokemonId: 78,
  },
  {
    title: "Pokemon Starblast",
    description: "Space shooter with Pokemon!",
    href: "/pokemon-starblast",
    color: "from-gray-700 to-gray-900",
    emoji: "🚀",
    pokemonId: 121,
  },
  {
    title: "Pokemon Typing",
    description: "Type Pokemon names fast!",
    href: "/pokemon-typing",
    color: "from-blue-500 to-indigo-600",
    emoji: "💬",
    pokemonId: 132,
  },
  {
    title: "Pokemon Finder",
    description: "Find the hidden Pokemon!",
    href: "/pokemon-finder",
    color: "from-emerald-500 to-teal-600",
    emoji: "🔍",
    pokemonId: 132,
  },
  {
    title: "Painting Studio",
    description: "Paint, draw & create Pokemon art!",
    href: "/pokemon-paint",
    color: "from-pink-400 to-purple-600",
    emoji: "🎨",
    pokemonId: 35,
  },
  {
    title: "Pokemon Count",
    description: "Count Pokemon & learn numbers!",
    href: "/pokemon-count",
    color: "from-teal-400 to-cyan-600",
    emoji: "🔢",
    pokemonId: 102,
  },
];

export default function Home() {
  return (
    <div className="py-8">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-red-600 mb-4 animate-bounce-slow">
          Welcome, Pokemon Trainer!
        </h1>
        <p className="text-xl text-gray-700">
          Choose a game to start your adventure!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${game.color} p-6 text-white shadow-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl group`}
          >
            <div className="absolute top-3 right-3 text-5xl opacity-30 group-hover:opacity-50 transition-opacity">
              {game.emoji}
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                  <Image
                    src={`/pokemon/${game.pokemonId}.png`}
                    alt=""
                    width={52}
                    height={52}
                    className="drop-shadow-lg"
                  />
                </div>
                <h2 className="text-2xl font-bold">{game.title}</h2>
              </div>
              <p className="text-base opacity-90">{game.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-gray-600">
          Featuring all <span className="font-bold text-red-600">1008</span> Pokemon!
        </p>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {[1, 4, 7, 25, 39, 52, 133, 143, 150].map((id) => (
            <div key={id} className="animate-bounce-slow" style={{ animationDelay: `${id * 0.1}s` }}>
              <Image
                src={`/pokemon/${id}.png`}
                alt=""
                width={48}
                height={48}
                className="drop-shadow-md"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
