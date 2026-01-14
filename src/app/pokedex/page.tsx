"use client";

import { useState } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";

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

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filteredPokemon = pokemon.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || p.types.includes(typeFilter);
    return matchesSearch && matchesType;
  });

  const allTypes = [...new Set(pokemon.flatMap((p) => p.types))].sort();

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-red-600 mb-8">
        📖 Pokedex
      </h1>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search Pokemon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-2xl border-4 border-blue-400 focus:border-blue-600 outline-none text-xl"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              !typeFilter ? "bg-gray-800 text-white scale-110" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            All Types
          </button>
          {allTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type === typeFilter ? null : type)}
              className={`px-4 py-2 rounded-full font-medium capitalize transition-all ${
                typeFilter === type
                  ? `${typeColors[type]} text-white scale-110`
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Pokemon Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {filteredPokemon.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPokemon(p)}
            className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border-4 border-transparent hover:border-yellow-400"
          >
            <Image
              src={p.image}
              alt={p.name}
              width={96}
              height={96}
              className="mx-auto"
            />
            <p className="text-center font-bold mt-2 text-sm">#{p.id}</p>
            <p className="text-center font-medium text-sm truncate">{p.name}</p>
          </button>
        ))}
      </div>

      {filteredPokemon.length === 0 && (
        <div className="text-center py-12">
          <p className="text-2xl text-gray-500">No Pokemon found!</p>
          <p className="text-gray-400">Try a different search</p>
        </div>
      )}

      {/* Pokemon Detail Modal */}
      {selectedPokemon && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPokemon(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <Image
                src={selectedPokemon.image}
                alt={selectedPokemon.name}
                width={200}
                height={200}
                className="mx-auto animate-bounce-slow"
              />
              <h2 className="text-3xl font-bold mt-4">
                #{selectedPokemon.id} {selectedPokemon.name}
              </h2>
              <div className="flex justify-center gap-2 mt-4">
                {selectedPokemon.types.map((type) => (
                  <span
                    key={type}
                    className={`${typeColors[type]} text-white px-4 py-2 rounded-full font-medium capitalize`}
                  >
                    {type}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setSelectedPokemon(null)}
                className="mt-8 bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
