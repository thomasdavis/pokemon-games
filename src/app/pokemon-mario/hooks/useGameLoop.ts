// Game loop hook for Pokemon Mario

import { useEffect, useRef, useCallback } from 'react';

type GameLoopCallback = (deltaTime: number) => void;

export const useGameLoop = (callback: GameLoopCallback, isRunning: boolean) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const callbackRef = useRef<GameLoopCallback>(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = Math.min((time - previousTimeRef.current) / 1000, 0.1); // Cap at 100ms
      callbackRef.current(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isRunning) {
      previousTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, animate]);
};

// Fixed timestep game loop for more consistent physics
export const useFixedGameLoop = (
  callback: GameLoopCallback,
  isRunning: boolean,
  fps: number = 60
) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const accumulatorRef = useRef<number>(0);
  const callbackRef = useRef<GameLoopCallback>(callback);

  const fixedDelta = 1 / fps;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const frameTime = Math.min((time - previousTimeRef.current) / 1000, 0.25);
      accumulatorRef.current += frameTime;

      // Run fixed updates
      while (accumulatorRef.current >= fixedDelta) {
        callbackRef.current(fixedDelta);
        accumulatorRef.current -= fixedDelta;
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [fixedDelta]);

  useEffect(() => {
    if (isRunning) {
      previousTimeRef.current = undefined;
      accumulatorRef.current = 0;
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, animate]);
};
