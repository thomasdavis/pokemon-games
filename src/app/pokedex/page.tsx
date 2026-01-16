"use client";

import { useState } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes, allGenerations } from "@/data/pokemon";

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

const generationLabels: Record<string, string> = {
  I: "Gen 1 (Kanto)",
  II: "Gen 2 (Johto)",
  III: "Gen 3 (Hoenn)",
  IV: "Gen 4 (Sinnoh)",
  V: "Gen 5 (Unova)",
  VI: "Gen 6 (Kalos)",
  VII: "Gen 7 (Alola)",
  VIII: "Gen 8 (Galar)",
  IX: "Gen 9 (Paldea)",
};

const statColors: Record<string, string> = {
  hp: "bg-red-500",
  attack: "bg-orange-500",
  defense: "bg-yellow-500",
  special_attack: "bg-blue-500",
  special_defense: "bg-green-500",
  speed: "bg-pink-500",
};

const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  special_attack: "Sp. Atk",
  special_defense: "Sp. Def",
  speed: "Speed",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const maxStat = 255;
  const percentage = Math.min((value / maxStat) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs font-medium text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-xs font-bold text-gray-700">{value}</span>
    </div>
  );
}

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [generationFilter, setGenerationFilter] = useState<string | null>(null);

  const filteredPokemon = pokemon.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || p.types.includes(typeFilter);
    const matchesGeneration = !generationFilter || p.generation === generationFilter;
    return matchesSearch && matchesType && matchesGeneration;
  });

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-red-600 mb-2">
        Pokedex
      </h1>
      <p className="text-center text-gray-500 mb-8">
        {pokemon.length} Pokemon to discover!
      </p>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search Pokemon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-2xl border-4 border-blue-400 focus:border-blue-600 outline-none text-xl"
        />

        {/* Generation Filter */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Filter by Generation:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGenerationFilter(null)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                !generationFilter ? "bg-indigo-600 text-white scale-105" : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              All Gens
            </button>
            {allGenerations.map((gen) => (
              <button
                key={gen}
                onClick={() => setGenerationFilter(gen === generationFilter ? null : gen)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  generationFilter === gen
                    ? "bg-indigo-600 text-white scale-105"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {generationLabels[gen] || `Gen ${gen}`}
              </button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Filter by Type:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter(null)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                !typeFilter ? "bg-gray-800 text-white scale-105" : "bg-gray-200 hover:bg-gray-300"
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
                    ? `${typeColors[type]} text-white scale-105`
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-500 mb-4">
        Showing {filteredPokemon.length} Pokemon
      </p>

      {/* Pokemon Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {filteredPokemon.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPokemon(p)}
            className={`bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border-4 border-transparent hover:border-yellow-400 ${
              p.is_legendary ? "ring-2 ring-yellow-400" : ""
            } ${p.is_mythical ? "ring-2 ring-purple-400" : ""}`}
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
            {(p.is_legendary || p.is_mythical) && (
              <p className="text-center text-xs mt-1">
                {p.is_legendary && <span className="text-yellow-600">Legendary</span>}
                {p.is_mythical && <span className="text-purple-600">Mythical</span>}
              </p>
            )}
          </button>
        ))}
      </div>

      {filteredPokemon.length === 0 && (
        <div className="text-center py-12">
          <p className="text-2xl text-gray-500">No Pokemon found!</p>
          <p className="text-gray-400">Try a different search or filter</p>
        </div>
      )}

      {/* Pokemon Detail Modal */}
      {selectedPokemon && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setSelectedPokemon(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              {/* Header with image */}
              <div className="relative">
                <Image
                  src={selectedPokemon.image}
                  alt={selectedPokemon.name}
                  width={160}
                  height={160}
                  className="mx-auto"
                />
                {selectedPokemon.is_legendary && (
                  <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                    Legendary
                  </span>
                )}
                {selectedPokemon.is_mythical && (
                  <span className="absolute top-0 right-0 bg-purple-400 text-purple-900 px-2 py-1 rounded-full text-xs font-bold">
                    Mythical
                  </span>
                )}
              </div>

              {/* Name and basic info */}
              <h2 className="text-2xl font-bold mt-2">
                #{selectedPokemon.id} {selectedPokemon.name}
              </h2>
              <p className="text-gray-500 italic">{selectedPokemon.genus}</p>
              <p className="text-sm text-indigo-600 font-medium">
                Generation {selectedPokemon.generation}
              </p>

              {/* Types */}
              <div className="flex justify-center gap-2 mt-3">
                {selectedPokemon.types.map((type) => (
                  <span
                    key={type}
                    className={`${typeColors[type]} text-white px-4 py-1 rounded-full font-medium capitalize text-sm`}
                  >
                    {type}
                  </span>
                ))}
              </div>

              {/* Flavor text */}
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-gray-700 text-sm italic">
                  &ldquo;{selectedPokemon.flavor_text}&rdquo;
                </p>
              </div>

              {/* Physical stats */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-500">Height</p>
                  <p className="font-bold">{(selectedPokemon.height / 10).toFixed(1)} m</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Weight</p>
                  <p className="font-bold">{(selectedPokemon.weight / 10).toFixed(1)} kg</p>
                </div>
              </div>

              {/* Base Stats */}
              <div className="mt-4">
                <h3 className="font-bold text-gray-700 mb-2">Base Stats</h3>
                <div className="space-y-2">
                  <StatBar
                    label={statLabels.hp}
                    value={selectedPokemon.hp}
                    color={statColors.hp}
                  />
                  <StatBar
                    label={statLabels.attack}
                    value={selectedPokemon.attack}
                    color={statColors.attack}
                  />
                  <StatBar
                    label={statLabels.defense}
                    value={selectedPokemon.defense}
                    color={statColors.defense}
                  />
                  <StatBar
                    label={statLabels.special_attack}
                    value={selectedPokemon.special_attack}
                    color={statColors.special_attack}
                  />
                  <StatBar
                    label={statLabels.special_defense}
                    value={selectedPokemon.special_defense}
                    color={statColors.special_defense}
                  />
                  <StatBar
                    label={statLabels.speed}
                    value={selectedPokemon.speed}
                    color={statColors.speed}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Total: {selectedPokemon.hp + selectedPokemon.attack + selectedPokemon.defense + selectedPokemon.special_attack + selectedPokemon.special_defense + selectedPokemon.speed}
                </p>
              </div>

              {/* Abilities */}
              <div className="mt-4">
                <h3 className="font-bold text-gray-700 mb-2">Abilities</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedPokemon.abilities.map((ability) => (
                    <span
                      key={ability.name}
                      className={`px-3 py-1 rounded-full text-sm ${
                        ability.is_hidden
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ability.name}
                      {ability.is_hidden && " (Hidden)"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedPokemon(null)}
                className="mt-6 bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-600 transition-colors"
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
