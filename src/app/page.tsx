import Image from "next/image";
import Link from "next/link";

const games = [
  {
    title: "Pokedex",
    description: "Browse all 150 Pokemon!",
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
          Featuring all <span className="font-bold text-red-600">150</span> original Pokemon!
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
