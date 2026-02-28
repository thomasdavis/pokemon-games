'use client';

/**
 * PokéSense Pokemon Details - Classic Pokedex Design
 * Looks like the actual Pokedex device from the anime
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pokemon, typeColors } from '@/data/pokemon';
import { speak, getVoices, loadVoices } from '@/lib/speech';
import { generatePokedexEntry } from '../lib/dialogues';

interface PokemonDetailsProps {
  pokemon: Pokemon;
  onContinue: () => void;
  factIndex: number;
  totalFacts: number;
}

export function PokemonDetails({
  pokemon,
  onContinue,
  factIndex,
  totalFacts,
}: PokemonDetailsProps) {
  const [pokedexEntry, setPokedexEntry] = useState<string>('');
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const [isSpeakingPokedex, setIsSpeakingPokedex] = useState(false);

  // Load Pokedex entry on mount
  useEffect(() => {
    setIsLoadingEntry(true);
    generatePokedexEntry(pokemon)
      .then(entry => setPokedexEntry(entry))
      .finally(() => setIsLoadingEntry(false));
  }, [pokemon]);

  // Speak Pokedex entry with robotic voice
  const speakPokedexEntry = useCallback(async () => {
    if (!pokedexEntry || isSpeakingPokedex) return;

    setIsSpeakingPokedex(true);

    await loadVoices();
    const voices = getVoices();

    const preferredVoices = [
      'Google UK English Male',
      'Microsoft David',
      'Daniel',
      'Alex',
      'Fred',
    ];

    let selectedVoice = voices.find(v =>
      preferredVoices.some(pref => v.name.includes(pref))
    );

    if (!selectedVoice) {
      selectedVoice = voices.find(v =>
        v.name.toLowerCase().includes('male') ||
        v.name.includes('David') ||
        v.name.includes('Daniel')
      );
    }

    speak(pokedexEntry, {
      rate: 0.85,
      pitch: 0.8,
      voice: selectedVoice,
      onEnd: () => setIsSpeakingPokedex(false),
    });
  }, [pokedexEntry, isSpeakingPokedex]);

  return (
    <div className="h-full flex flex-col">
      {/* POKEDEX DEVICE */}
      <div className="bg-gradient-to-b from-red-500 to-red-700 rounded-3xl p-3 shadow-2xl border-4 border-red-800 h-full flex flex-col">
        {/* Top lights */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          <div className="w-3 h-3 bg-red-400 rounded-full border border-red-300" />
          <div className="w-3 h-3 bg-yellow-400 rounded-full border border-yellow-300" />
          <div className="w-3 h-3 bg-green-400 rounded-full border border-green-300" />
        </div>

        {/* Main Screen */}
        <div className="bg-gray-800 rounded-xl p-2 border-4 border-gray-600 flex-1 flex flex-col min-h-0">
          {/* Screen inner bezel */}
          <div className="bg-gradient-to-b from-green-200 to-green-100 rounded-lg flex-1 flex flex-col overflow-hidden">
            {/* Pokemon Header */}
            <div className="bg-gradient-to-r from-green-300 to-green-200 px-3 py-2 flex items-center gap-3 border-b-2 border-green-400">
              <div className="relative w-14 h-14 flex-shrink-0">
                <Image
                  src={`/pokemon/${pokemon.id}.png`}
                  alt={pokemon.name}
                  fill
                  className="object-contain drop-shadow"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 truncate leading-tight">
                  {pokemon.name}
                </h2>
                <p className="text-xs text-gray-600">
                  No. {pokemon.id.toString().padStart(4, '0')}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {pokemon.types.map(type => (
                  <span
                    key={type}
                    className="px-2 py-0.5 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: typeColors[type] || '#888' }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Scrollable Entry Area */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {isLoadingEntry ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-600">
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-sm font-mono">SCANNING...</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 font-mono leading-relaxed">
                  {pokedexEntry}
                </p>
              )}
            </div>

            {/* Bottom Stats Bar */}
            <div className="bg-green-300/50 px-3 py-2 border-t-2 border-green-400 flex items-center gap-4 text-xs font-mono text-gray-700">
              <span>HT: {(pokemon.height / 10).toFixed(1)}m</span>
              <span>WT: {(pokemon.weight / 10).toFixed(1)}kg</span>
              {pokemon.generation && <span>GEN {pokemon.generation}</span>}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="mt-2 flex items-center justify-between">
          {/* Speaker Button */}
          <button
            onClick={speakPokedexEntry}
            disabled={isLoadingEntry || isSpeakingPokedex}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all shadow-lg border-2 ${
              isSpeakingPokedex
                ? 'bg-green-400 border-green-300 animate-pulse scale-110'
                : 'bg-gray-300 border-gray-400 hover:bg-gray-200 hover:scale-105'
            } disabled:opacity-50`}
          >
            {isSpeakingPokedex ? '🔊' : '📢'}
          </button>

          {/* D-Pad placeholder */}
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 rounded-full border-2 border-gray-600" />
          </div>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="bg-gradient-to-b from-green-400 to-green-600 text-white text-xs font-bold px-4 py-3 rounded-lg shadow-lg border-2 border-green-700 hover:from-green-300 hover:to-green-500 active:scale-95 transition-all"
          >
            NEXT
          </button>
        </div>

        {/* Legendary/Mythical Badge */}
        {(pokemon.is_legendary || pokemon.is_mythical) && (
          <div className="mt-2 text-center">
            {pokemon.is_legendary && (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full font-bold text-xs animate-pulse">
                ⭐ LEGENDARY ⭐
              </span>
            )}
            {pokemon.is_mythical && (
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-3 py-1 rounded-full font-bold text-xs animate-pulse">
                ✨ MYTHICAL ✨
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
