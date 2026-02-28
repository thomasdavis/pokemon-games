'use client';

import Link from 'next/link';
import { NameEditor } from '@/lib/player';

/**
 * Header component with navigation and player name editor
 */
export function Header() {
  return (
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
              <Link href="/poke-sense" className="hover:text-yellow-300 transition-colors font-medium">
                PokéSense
              </Link>
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
              <Link href="/pokemon-typing" className="hover:text-yellow-300 transition-colors font-medium">
                Type It!
              </Link>
              <Link href="/letter-drop" className="hover:text-yellow-300 transition-colors font-medium">
                Letter Drop
              </Link>
              <Link href="/bubble-type" className="hover:text-yellow-300 transition-colors font-medium">
                Bubble Type
              </Link>
              <Link href="/pokemon-race" className="hover:text-yellow-300 transition-colors font-medium">
                Race
              </Link>
              <Link href="/pokemon-mario" className="hover:text-yellow-300 transition-colors font-medium">
                Mario
              </Link>
              <Link href="/pokemon-math" className="hover:text-yellow-300 transition-colors font-medium">
                Math
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
              <Link href="/type-dominance" className="hover:text-yellow-300 transition-colors font-medium">
                Types
              </Link>
              <Link href="/bagon-headbutt" className="hover:text-yellow-300 transition-colors font-medium">
                Headbutt
              </Link>
            </div>
          </div>
        </div>
      </nav>
  );
}
