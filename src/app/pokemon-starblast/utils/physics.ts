// Pokemon Starblast - Physics Utilities

import { Vector2D, Entity, Bounds, Collision } from '../types';
import { GAME_CONFIG } from './constants';

// ============ Vector Math ============

export function vectorAdd(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSubtract(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorMultiply(v: Vector2D, scalar: number): Vector2D {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function vectorMagnitude(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorNormalize(v: Vector2D): Vector2D {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function vectorDistance(a: Vector2D, b: Vector2D): number {
  return vectorMagnitude(vectorSubtract(a, b));
}

export function vectorAngle(v: Vector2D): number {
  return Math.atan2(v.y, v.x);
}

export function vectorFromAngle(angle: number, magnitude: number = 1): Vector2D {
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

export function vectorLerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function vectorRotate(v: Vector2D, angle: number): Vector2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

// ============ Collision Detection ============

export function getEntityBounds(entity: Entity): Bounds {
  return {
    left: entity.x,
    right: entity.x + entity.width,
    top: entity.y,
    bottom: entity.y + entity.height,
  };
}

export function getEntityCenter(entity: Entity): Vector2D {
  return {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
}

export function checkAABBCollision(a: Entity, b: Entity): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function checkCircleCollision(
  aCenter: Vector2D,
  aRadius: number,
  bCenter: Vector2D,
  bRadius: number
): boolean {
  const distance = vectorDistance(aCenter, bCenter);
  return distance < aRadius + bRadius;
}

export function checkPointInRect(point: Vector2D, rect: Entity): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getCollisionPenetration(a: Entity, b: Entity): Collision {
  const boundsA = getEntityBounds(a);
  const boundsB = getEntityBounds(b);

  const overlapX = Math.min(boundsA.right - boundsB.left, boundsB.right - boundsA.left);
  const overlapY = Math.min(boundsA.bottom - boundsB.top, boundsB.bottom - boundsA.top);

  if (overlapX <= 0 || overlapY <= 0) {
    return { collided: false };
  }

  // Determine push direction
  const centerA = getEntityCenter(a);
  const centerB = getEntityCenter(b);
  const pushX = centerA.x < centerB.x ? -overlapX : overlapX;
  const pushY = centerA.y < centerB.y ? -overlapY : overlapY;

  return {
    collided: true,
    penetration: { x: pushX, y: pushY },
  };
}

// ============ Graze Detection ============

export function checkGraze(
  playerCenter: Vector2D,
  playerRadius: number,
  projectileCenter: Vector2D,
  projectileRadius: number,
  grazeDistance: number
): boolean {
  const distance = vectorDistance(playerCenter, projectileCenter);
  const collisionDistance = playerRadius + projectileRadius;
  const grazeOuterDistance = collisionDistance + grazeDistance;

  // Graze if close but not colliding
  return distance > collisionDistance && distance <= grazeOuterDistance;
}

// ============ Movement ============

export function moveEntity(entity: Entity, delta: number): Entity {
  return {
    ...entity,
    x: entity.x + entity.velocity.x * delta,
    y: entity.y + entity.velocity.y * delta,
  };
}

export function clampToViewport(
  entity: Entity,
  margin: number = 0
): Entity {
  const minX = margin;
  const maxX = GAME_CONFIG.VIEWPORT_WIDTH - entity.width - margin;
  const minY = margin;
  const maxY = GAME_CONFIG.VIEWPORT_HEIGHT - entity.height - margin;

  return {
    ...entity,
    x: Math.max(minX, Math.min(maxX, entity.x)),
    y: Math.max(minY, Math.min(maxY, entity.y)),
  };
}

export function isOutOfBounds(
  entity: Entity,
  margin: number = 100
): boolean {
  return (
    entity.x < -margin ||
    entity.x > GAME_CONFIG.VIEWPORT_WIDTH + margin ||
    entity.y < -margin ||
    entity.y > GAME_CONFIG.VIEWPORT_HEIGHT + margin
  );
}

export function wrapPosition(
  entity: Entity,
  horizontal: boolean = true,
  vertical: boolean = false
): Entity {
  let { x, y } = entity;

  if (horizontal) {
    if (x + entity.width < 0) x = GAME_CONFIG.VIEWPORT_WIDTH;
    if (x > GAME_CONFIG.VIEWPORT_WIDTH) x = -entity.width;
  }

  if (vertical) {
    if (y + entity.height < 0) y = GAME_CONFIG.VIEWPORT_HEIGHT;
    if (y > GAME_CONFIG.VIEWPORT_HEIGHT) y = -entity.height;
  }

  return { ...entity, x, y };
}

// ============ Targeting & Aim ============

export function getAngleToTarget(from: Vector2D, to: Vector2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function getDirectionToTarget(from: Vector2D, to: Vector2D): Vector2D {
  return vectorNormalize(vectorSubtract(to, from));
}

export function aimAtTarget(
  from: Vector2D,
  to: Vector2D,
  speed: number
): Vector2D {
  const direction = getDirectionToTarget(from, to);
  return vectorMultiply(direction, speed);
}

export function leadTarget(
  shooterPos: Vector2D,
  targetPos: Vector2D,
  targetVel: Vector2D,
  projectileSpeed: number
): Vector2D {
  // Predict where target will be
  const toTarget = vectorSubtract(targetPos, shooterPos);
  const distance = vectorMagnitude(toTarget);
  const time = distance / projectileSpeed;

  const predictedPos = vectorAdd(targetPos, vectorMultiply(targetVel, time));
  return getDirectionToTarget(shooterPos, predictedPos);
}

// ============ Homing ============

export function homingUpdate(
  projectile: Entity,
  targetPos: Vector2D,
  turnRate: number,
  speed: number,
  delta: number
): Vector2D {
  const currentAngle = vectorAngle(projectile.velocity);
  const targetAngle = getAngleToTarget(getEntityCenter(projectile), targetPos);

  // Calculate angle difference
  let angleDiff = targetAngle - currentAngle;

  // Normalize to -PI to PI
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  // Clamp turn rate
  const maxTurn = turnRate * delta * (Math.PI / 180);
  const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

  const newAngle = currentAngle + turn;
  return vectorFromAngle(newAngle, speed);
}

// ============ Spawning ============

export function getRandomSpawnPosition(
  width: number,
  height: number,
  pattern: 'top' | 'sides' | 'any' = 'top'
): Vector2D {
  const { VIEWPORT_WIDTH, SPAWN_MARGIN_TOP, SPAWN_MARGIN_SIDES } = GAME_CONFIG;

  switch (pattern) {
    case 'top':
      return {
        x: SPAWN_MARGIN_SIDES + Math.random() * (VIEWPORT_WIDTH - width - SPAWN_MARGIN_SIDES * 2),
        y: SPAWN_MARGIN_TOP - height,
      };
    case 'sides':
      const side = Math.random() < 0.5 ? 'left' : 'right';
      return {
        x: side === 'left' ? -width : VIEWPORT_WIDTH,
        y: Math.random() * (GAME_CONFIG.VIEWPORT_HEIGHT / 2),
      };
    case 'any':
    default:
      return {
        x: SPAWN_MARGIN_SIDES + Math.random() * (VIEWPORT_WIDTH - width - SPAWN_MARGIN_SIDES * 2),
        y: SPAWN_MARGIN_TOP - height,
      };
  }
}

export function getFormationPositions(
  pattern: 'wave' | 'v-formation' | 'diagonal',
  count: number,
  spacing: number = 60
): Vector2D[] {
  const positions: Vector2D[] = [];
  const { VIEWPORT_WIDTH, SPAWN_MARGIN_TOP } = GAME_CONFIG;
  const centerX = VIEWPORT_WIDTH / 2;

  switch (pattern) {
    case 'wave':
      const waveWidth = (count - 1) * spacing;
      const startX = centerX - waveWidth / 2;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX + i * spacing,
          y: SPAWN_MARGIN_TOP,
        });
      }
      break;

    case 'v-formation':
      const halfCount = Math.floor(count / 2);
      for (let i = 0; i < count; i++) {
        const offset = i - halfCount;
        positions.push({
          x: centerX + offset * spacing,
          y: SPAWN_MARGIN_TOP - Math.abs(offset) * (spacing / 2),
        });
      }
      break;

    case 'diagonal':
      for (let i = 0; i < count; i++) {
        positions.push({
          x: VIEWPORT_WIDTH * 0.2 + i * spacing,
          y: SPAWN_MARGIN_TOP - i * (spacing / 2),
        });
      }
      break;
  }

  return positions;
}

// ============ Screen Shake ============

export function getScreenShakeOffset(intensity: number): Vector2D {
  const angle = Math.random() * Math.PI * 2;
  const magnitude = Math.random() * intensity;
  return vectorFromAngle(angle, magnitude);
}

// ============ Input Movement ============

/**
 * Get movement vector from input state (for player controls)
 */
export function getMovementVector(input: { up: boolean; down: boolean; left: boolean; right: boolean }): Vector2D {
  let x = 0;
  let y = 0;

  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;

  // Normalize diagonal movement
  if (x !== 0 && y !== 0) {
    const length = Math.sqrt(x * x + y * y);
    x /= length;
    y /= length;
  }

  return { x, y };
}
