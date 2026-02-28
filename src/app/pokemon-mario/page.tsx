"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with game loop
const Game = dynamic(() => import('./components/Game'), { ssr: false });

export default function PokemonMarioPage() {
  const router = useRouter();
  const [showGame, setShowGame] = useState(true);

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-8 drop-shadow-lg">
          Pokemon Mario! 🍄⚡
        </h1>

        {showGame && <Game onBack={handleBack} />}

        <div className="mt-6 text-white/80">
          <p className="mb-2">A Pokemon-themed platformer adventure!</p>
          <p className="text-sm">
            Use arrow keys to move, up/space to jump. Stomp on enemies to defeat them!
          </p>
        </div>
      </div>
    </div>
  );
}
