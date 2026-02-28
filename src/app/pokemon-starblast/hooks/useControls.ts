// Pokemon Starblast - Controls Hook

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameInput } from '../types';

/**
 * Main controls hook for the space shooter
 * Arrow keys for movement, Space for fire, Shift for special
 */
export function useControls(): GameInput {
  const [input, setInput] = useState<GameInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    special: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if ([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'ShiftLeft', 'ShiftRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX'
    ].includes(e.code)) {
      e.preventDefault();
    }

    setInput(prev => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          return { ...prev, up: true };
        case 'ArrowDown':
        case 'KeyS':
          return { ...prev, down: true };
        case 'ArrowLeft':
        case 'KeyA':
          return { ...prev, left: true };
        case 'ArrowRight':
        case 'KeyD':
          return { ...prev, right: true };
        case 'Space':
        case 'KeyZ':
          return { ...prev, fire: true };
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          return { ...prev, special: true };
        default:
          return prev;
      }
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setInput(prev => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          return { ...prev, up: false };
        case 'ArrowDown':
        case 'KeyS':
          return { ...prev, down: false };
        case 'ArrowLeft':
        case 'KeyA':
          return { ...prev, left: false };
        case 'ArrowRight':
        case 'KeyD':
          return { ...prev, right: false };
        case 'Space':
        case 'KeyZ':
          return { ...prev, fire: false };
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          return { ...prev, special: false };
        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return input;
}

/**
 * Hook to detect single key tap (fires once per press)
 */
export function useKeyTap(targetKey: string, callback: () => void) {
  const wasPressed = useRef(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey && !wasPressed.current) {
        wasPressed.current = true;
        callback();
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        wasPressed.current = false;
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey, callback]);
}

/**
 * Hook to detect if a key is currently pressed
 */
export function useKeyPressed(targetKey: string): boolean {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        setPressed(true);
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        setPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return pressed;
}

/**
 * Get movement vector from input
 */
export function getMovementVector(input: GameInput): { x: number; y: number } {
  let x = 0;
  let y = 0;

  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;

  // Normalize diagonal movement
  if (x !== 0 && y !== 0) {
    const magnitude = Math.sqrt(x * x + y * y);
    x /= magnitude;
    y /= magnitude;
  }

  return { x, y };
}

/**
 * Hook for touch/mobile controls (future implementation)
 */
export function useTouchControls(): GameInput {
  const [input, setInput] = useState<GameInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    special: false,
  });

  // Touch controls would go here
  // For now, return empty input

  return input;
}

/**
 * Combined controls hook that uses keyboard or touch based on device
 */
export function useGameControls(): GameInput {
  const keyboardInput = useControls();
  const touchInput = useTouchControls();

  // Combine inputs (OR logic)
  return {
    up: keyboardInput.up || touchInput.up,
    down: keyboardInput.down || touchInput.down,
    left: keyboardInput.left || touchInput.left,
    right: keyboardInput.right || touchInput.right,
    fire: keyboardInput.fire || touchInput.fire,
    special: keyboardInput.special || touchInput.special,
  };
}
