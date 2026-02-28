// Keyboard controls hook for Pokemon Mario

import { useState, useEffect, useCallback } from 'react';
import { GameInput } from '../types';

export const useControls = (): GameInput => {
  const [input, setInput] = useState<GameInput>({
    left: false,
    right: false,
    jump: false,
    action: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyZ', 'KeyX', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
      e.preventDefault();
    }

    setInput(prev => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          return { ...prev, left: true };
        case 'ArrowRight':
        case 'KeyD':
          return { ...prev, right: true };
        case 'ArrowUp':
        case 'Space':
        case 'KeyW':
          return { ...prev, jump: true };
        case 'KeyZ':
        case 'KeyX':
          return { ...prev, action: true };
        default:
          return prev;
      }
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setInput(prev => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          return { ...prev, left: false };
        case 'ArrowRight':
        case 'KeyD':
          return { ...prev, right: false };
        case 'ArrowUp':
        case 'Space':
        case 'KeyW':
          return { ...prev, jump: false };
        case 'KeyZ':
        case 'KeyX':
          return { ...prev, action: false };
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
};

// Hook to detect single key press (not held)
export const useKeyPress = (targetKey: string): boolean => {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        setKeyPressed(true);
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
};

// Hook for detecting key tap (fires once per press)
export const useKeyTap = (targetKey: string, callback: () => void) => {
  const [wasPressed, setWasPressed] = useState(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey && !wasPressed) {
        setWasPressed(true);
        callback();
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.code === targetKey) {
        setWasPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey, callback, wasPressed]);
};
