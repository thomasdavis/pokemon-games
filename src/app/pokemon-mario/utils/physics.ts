// Physics and collision utilities for Pokemon Mario

import { Bounds, CollisionResult, Vector2D, Platform, PlayerState } from '../types';
import { GAME_CONFIG } from './constants';

const { GRAVITY, MAX_FALL_SPEED, FRICTION, AIR_RESISTANCE } = GAME_CONFIG;

// Check if two bounds overlap
export const checkCollision = (a: Bounds, b: Bounds): boolean => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
};

// Get detailed collision result with direction
export const getCollisionResult = (
  moving: Bounds & { velocity: Vector2D },
  stationary: Bounds
): CollisionResult => {
  if (!checkCollision(moving, stationary)) {
    return { collided: false, direction: null, overlap: 0 };
  }

  // Calculate overlaps from each direction
  const overlapLeft = (moving.x + moving.width) - stationary.x;
  const overlapRight = (stationary.x + stationary.width) - moving.x;
  const overlapTop = (moving.y + moving.height) - stationary.y;
  const overlapBottom = (stationary.y + stationary.height) - moving.y;

  // Find minimum overlap (most likely collision direction)
  const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  let direction: CollisionResult['direction'] = null;

  if (minOverlap === overlapTop && moving.velocity.y >= 0) {
    direction = 'top';
  } else if (minOverlap === overlapBottom && moving.velocity.y <= 0) {
    direction = 'bottom';
  } else if (minOverlap === overlapLeft) {
    direction = 'left';
  } else if (minOverlap === overlapRight) {
    direction = 'right';
  }

  return { collided: true, direction, overlap: minOverlap };
};

// Apply gravity to velocity
export const applyGravity = (velocity: Vector2D): Vector2D => {
  return {
    x: velocity.x,
    y: Math.min(velocity.y + GRAVITY, MAX_FALL_SPEED),
  };
};

// Apply friction (when grounded)
export const applyFriction = (velocity: Vector2D, isGrounded: boolean): Vector2D => {
  const friction = isGrounded ? FRICTION : AIR_RESISTANCE;
  return {
    x: velocity.x * friction,
    y: velocity.y,
  };
};

// Resolve platform collision
export const resolvePlatformCollision = (
  player: PlayerState,
  platform: Platform
): { position: Vector2D; velocity: Vector2D; isGrounded: boolean } => {
  const collision = getCollisionResult(
    { ...player, velocity: player.velocity },
    platform
  );

  if (!collision.collided) {
    return {
      position: { x: player.x, y: player.y },
      velocity: player.velocity,
      isGrounded: false,
    };
  }

  let newX = player.x;
  let newY = player.y;
  let newVelX = player.velocity.x;
  let newVelY = player.velocity.y;
  let isGrounded = player.isGrounded;

  switch (collision.direction) {
    case 'top':
      // Landing on platform
      newY = platform.y - player.height;
      newVelY = 0;
      isGrounded = true;

      // Bounce platform
      if (platform.type === 'bounce') {
        newVelY = -18; // Super bounce
        isGrounded = false;
      }
      break;

    case 'bottom':
      // Hitting head on platform
      newY = platform.y + platform.height;
      newVelY = 0;
      break;

    case 'left':
      // Hitting right side of platform
      newX = platform.x - player.width;
      newVelX = 0;
      break;

    case 'right':
      // Hitting left side of platform
      newX = platform.x + platform.width;
      newVelX = 0;
      break;
  }

  return {
    position: { x: newX, y: newY },
    velocity: { x: newVelX, y: newVelY },
    isGrounded,
  };
};

// Check if player is on any platform
export const checkGrounded = (
  player: Bounds & { velocity: Vector2D },
  platforms: Platform[]
): boolean => {
  // Check slightly below player
  const groundCheck: Bounds = {
    x: player.x + 2,
    y: player.y + player.height,
    width: player.width - 4,
    height: 5,
  };

  return platforms.some(platform => checkCollision(groundCheck, platform));
};

// Move and collide with all platforms
export const moveAndCollide = (
  player: PlayerState,
  platforms: Platform[]
): PlayerState => {
  // Apply physics
  let velocity = applyGravity(player.velocity);
  velocity = applyFriction(velocity, player.isGrounded);

  // Move player
  let newX = player.x + velocity.x;
  let newY = player.y + velocity.y;
  let isGrounded = false;

  // Create updated player bounds for collision checking
  const movingPlayer = {
    ...player,
    x: newX,
    y: newY,
    velocity,
  };

  // Check collision with each platform
  for (const platform of platforms) {
    if (!checkCollision(movingPlayer, platform)) continue;

    const result = resolvePlatformCollision(movingPlayer, platform);
    newX = result.position.x;
    newY = result.position.y;
    velocity = result.velocity;
    isGrounded = result.isGrounded || isGrounded;

    // Update moving player for next collision check
    movingPlayer.x = newX;
    movingPlayer.y = newY;
    movingPlayer.velocity = velocity;
  }

  // Double-check grounded state
  if (!isGrounded) {
    isGrounded = checkGrounded(movingPlayer, platforms);
  }

  return {
    ...player,
    x: newX,
    y: newY,
    velocity,
    isGrounded,
    isJumping: !isGrounded && velocity.y < 0,
    hasDoubleJumped: isGrounded ? false : player.hasDoubleJumped,
  };
};

// Calculate camera position
export const calculateCamera = (
  playerX: number,
  playerY: number,
  currentCamera: Vector2D,
  levelWidth: number,
  levelHeight: number
): Vector2D => {
  const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CAMERA_LEAD, CAMERA_SMOOTHING } = GAME_CONFIG;

  // Target camera position (center on player with lead)
  const targetX = playerX - VIEWPORT_WIDTH / 2 + CAMERA_LEAD;
  const targetY = playerY - VIEWPORT_HEIGHT / 2;

  // Smooth camera movement
  const newX = currentCamera.x + (targetX - currentCamera.x) * CAMERA_SMOOTHING;
  const newY = currentCamera.y + (targetY - currentCamera.y) * CAMERA_SMOOTHING;

  // Clamp to level bounds
  return {
    x: Math.max(0, Math.min(newX, levelWidth - VIEWPORT_WIDTH)),
    y: Math.max(0, Math.min(newY, levelHeight - VIEWPORT_HEIGHT)),
  };
};

// Check if player fell off the level
export const checkFallDeath = (playerY: number, levelHeight: number): boolean => {
  return playerY > levelHeight + 100;
};

// Get distance between two points
export const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Check if point is in bounds
export const pointInBounds = (point: Vector2D, bounds: Bounds): boolean => {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};
