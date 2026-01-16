'use client';

import Link from 'next/link';
import { NameEditor, PlayerProvider } from '@/lib/player';

/**
 * Header component with navigation and player name editor
 */
export function Header() {
  return (
    <PlayerProvider>
      <nav className="bg-red-500 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
            <span className="text-yellow-300">⚡</span>
            Pokemon Games
            <span className="text-yellow-300">⚡</span>
          </Link>
          <div className="flex items-center gap-4">
            <NameEditor className="text-sm" />
            <div className="flex gap-3 flex-wrap text-sm">
              <Link href="/pokedex" className="hover:text-yellow-300 transition-colors font-medium">
                Pokedex
              </Link>
              <Link href="/catch" className="hover:text-yellow-300 transition-colors font-medium">
                Catch
              </Link>
              <Link href="/bubble-pop" className="hover:text-yellow-300 transition-colors font-medium">
                Bubbles
              </Link>
              <Link href="/memory" className="hover:text-yellow-300 transition-colors font-medium">
                Memory
              </Link>
              <Link href="/whos-that-pokemon" className="hover:text-yellow-300 transition-colors font-medium">
                Who&apos;s That?
              </Link>
              <Link href="/quiz" className="hover:text-yellow-300 transition-colors font-medium">
                Quiz
              </Link>
              <Link href="/evolution" className="hover:text-yellow-300 transition-colors font-medium">
                Evolution
              </Link>
              <Link href="/feed" className="hover:text-yellow-300 transition-colors font-medium">
                Feed
              </Link>
              <Link href="/size-sort" className="hover:text-yellow-300 transition-colors font-medium">
                Big/Small
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </PlayerProvider>
  );
}
