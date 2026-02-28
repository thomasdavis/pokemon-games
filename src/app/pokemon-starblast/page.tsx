"use client";

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser APIs
const Game = dynamic(() => import('./components/Game'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">🚀</div>
        <div className="text-white text-xl font-bold">Loading Pokemon Starblast...</div>
        <div className="text-gray-400 mt-2">Preparing your spaceship</div>
      </div>
    </div>
  ),
});

export default function PokemonStarblastPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <Game onBack={() => router.push('/')} />
      </div>
    </main>
  );
}
