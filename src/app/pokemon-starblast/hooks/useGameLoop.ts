// Pokemon Starblast - Game Loop Hook

import { useEffect, useRef, useCallback } from 'react';

type GameLoopCallback = (deltaTime: number) => void;

/**
 * Basic game loop using requestAnimationFrame
 */
export function useGameLoop(callback: GameLoopCallback, isRunning: boolean) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
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
}

/**
 * Fixed timestep game loop for consistent physics
 * Runs at specified FPS regardless of display refresh rate
 */
export function useFixedGameLoop(
  callback: GameLoopCallback,
  isRunning: boolean,
  fps: number = 60
) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
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
}

/**
 * Game loop with slow-motion support
 */
export function useGameLoopWithSlowMo(
  callback: GameLoopCallback,
  isRunning: boolean,
  slowMoFactor: number = 1.0,
  fps: number = 60
) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef<number>(0);
  const callbackRef = useRef<GameLoopCallback>(callback);
  const slowMoRef = useRef<number>(slowMoFactor);

  const fixedDelta = 1 / fps;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    slowMoRef.current = slowMoFactor;
  }, [slowMoFactor]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const frameTime = Math.min((time - previousTimeRef.current) / 1000, 0.25);
      // Apply slow-mo factor to frame time
      accumulatorRef.current += frameTime * slowMoRef.current;

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
}

/**
 * Hook to get elapsed game time
 */
export function useGameTime(isRunning: boolean) {
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === 0) {
        startTimeRef.current = performance.now();
      } else {
        // Resume from pause
        const pauseDuration = performance.now() - pauseTimeRef.current;
        startTimeRef.current += pauseDuration;
      }
    } else if (startTimeRef.current > 0) {
      // Pausing
      pauseTimeRef.current = performance.now();
      elapsedRef.current = (pauseTimeRef.current - startTimeRef.current) / 1000;
    }
  }, [isRunning]);

  const getElapsedTime = useCallback(() => {
    if (!isRunning) {
      return elapsedRef.current;
    }
    return (performance.now() - startTimeRef.current) / 1000;
  }, [isRunning]);

  const resetTime = useCallback(() => {
    startTimeRef.current = 0;
    pauseTimeRef.current = 0;
    elapsedRef.current = 0;
  }, []);

  return { getElapsedTime, resetTime };
}
