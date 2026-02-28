'use client';

import { PlayerProvider } from '@/lib/player';
import { ReactNode } from 'react';

/**
 * Client-side providers wrapper for the entire app
 * This ensures PlayerProvider context is available to all pages
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      {children}
    </PlayerProvider>
  );
}
