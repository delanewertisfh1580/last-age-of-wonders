import { calculateDamage, createCombatant } from '../../../domain/naval/NavalCombat.js';
import type { IRngService } from '../../../domain/rng/IRngService.js';
import { STREAM_NAMES } from '../../../shared/rng/stream-names.js';

/** Арена боя в мировых координатах (рендер сам проецирует её на канвас). */
export const ARENA = { width: 1000, height: 660, margin: 90 } as const;

export interface BattleShip {
  x: number;
  y: number;
  heading: number;
  speed: number;
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
  turnRate: number;
  reloadTime: number;
  reload: number;
}

export interface BattleInput {
  /** -1 назад … 0 … 1 полный ход */
  readonly throttle: number;
  /** -1 влево … 1 вправо */
  readonly turn: number;
  readonly fire: boolean;
}

export interface BattleShot {
  readonly from: 'player' | 'enemy';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly hit: boolean;
  readonly damage: number;
}

export interface BattleConfig {
  readonly playerHp: number;
  readonly playerPower: number;
  readonly playerArmor: number;
  readonly enemyName: string;
  readonly enemyHp: number;
  readonly enemyPower: number;
  readonly enemyArmor: number;
  readonly turnMultiplier?: number;
  readonly reloadMultiplier?: number;
  readonly doctrine?: number;
}

export type BattleStatus = 'ongoing' | 'victory' | 'defeat';

const MAX_SPEED = 108;
const ACCEL = 78;
const BROADSIDE_RANGE = 350;
/** Полуширина сектора стрельбы от траверза (радианы). */
const ARC_HALF = 0.52;

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Бой в реальном времени: руль, ход и бортовой залп.
 * Математика урона — доменная (`calculateDamage`), поэтому исход детерминирован по сиду.
 */
export class BattleSim {
  readonly player: BattleShip;
  readonly enemy: BattleShip;
  readonly enemyName: string;
  readonly loot: number;
  status: BattleStatus = 'ongoing';
  time = 0;
  private readonly shots: BattleShot[] = [];
  private readonly turnMultiplier: number;
  private readonly reloadMultiplier: number;
  private readonly doctrine: number;

  constructor(config: BattleConfig, private readonly rng: IRngService, loot = 0) {
    this.enemyName = config.enemyName;
    this.loot = loot;
    this.turnMultiplier = config.turnMultiplier ?? 1;
    this.reloadMultiplier = config.reloadMultiplier ?? 1;
    this.doctrine = config.doctrine ?? 0.15;
    this.player = {
      x: ARENA.margin + 60,
      y: ARENA.height / 2,
      heading: 0,
      speed: 0,
      hp: config.playerHp,
      maxHp: config.playerHp,
      power: config.playerPower,
      armor: config.playerArmor,
      turnRate: 1.75 * this.turnMultiplier,
      reloadTime: 2.2 * this.reloadMultiplier,
      reload: 0,
    };
    this.enemy = {
      x: ARENA.width - ARENA.margin - 60,
      y: ARENA.height / 2 + 40,
      heading: Math.PI,
      speed: 0,
      hp: config.enemyHp,
      maxHp: config.enemyHp,
      power: config.enemyPower,
      armor: config.enemyArmor,
      turnRate: 1.4,
      reloadTime: 2.7,
      reload: 0.8,
    };
  }

  drainShots(): BattleShot[] {
    return this.shots.splice(0, this.shots.length);
  }

  distance(): number {
    return Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
  }

  /** true, если цель в секторе бортового залпа игрока. */
  enemyInArc(): boolean {
    return this.inArc(this.player, this.enemy);
  }

  private inArc(from: BattleShip, target: BattleShip): boolean {
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    if (Math.hypot(dx, dy) > BROADSIDE_RANGE) return false;
    const bearing = normalizeAngle(Math.atan2(dy, dx) - from.heading);
    return Math.abs(Math.abs(bearing) - Math.PI / 2) <= ARC_HALF;
  }

  update(dt: number, input: BattleInput): void {
    if (this.status !== 'ongoing') return;
    const step = Math.min(0.05, Math.max(0, dt));
    this.time += step;

    this.steer(this.player, step, input.turn, input.throttle);
    if (input.fire) this.tryFire(this.player, this.enemy, 'player');

    const ai = this.enemyInput();
    this.steer(this.enemy, step, ai.turn, ai.throttle);
    if (ai.fire) this.tryFire(this.enemy, this.player, 'enemy');

    this.player.reload = Math.max(0, this.player.reload - step);
    this.enemy.reload = Math.max(0, this.enemy.reload - step);

    if (this.enemy.hp <= 0 && this.player.hp <= 0) {
      this.status = this.player.hp >= this.enemy.hp ? 'victory' : 'defeat';
    } else if (this.enemy.hp <= 0) {
      this.status = 'victory';
    } else if (this.player.hp <= 0) {
      this.status = 'defeat';
    }
    if (this.player.hp < 0) this.player.hp = 0;
    if (this.enemy.hp < 0) this.enemy.hp = 0;
  }

  private steer(ship: BattleShip, dt: number, turn: number, throttle: number): void {
    ship.speed = clamp(ship.speed + throttle * ACCEL * dt, -MAX_SPEED * 0.35, MAX_SPEED);
    if (Math.abs(throttle) < 0.01) ship.speed *= Math.max(0, 1 - 0.7 * dt);
    ship.heading = normalizeAngle(ship.heading + clamp(turn, -1, 1) * ship.turnRate * dt);
    ship.x += Math.cos(ship.heading) * ship.speed * dt;
    ship.y += Math.sin(ship.heading) * ship.speed * dt;

    const minX = ARENA.margin;
    const maxX = ARENA.width - ARENA.margin;
    const minY = ARENA.margin;
    const maxY = ARENA.height - ARENA.margin;
    if (ship.x < minX || ship.x > maxX) {
      ship.x = clamp(ship.x, minX, maxX);
      ship.speed *= 0.5;
    }
    if (ship.y < minY || ship.y > maxY) {
      ship.y = clamp(ship.y, minY, maxY);
      ship.speed *= 0.5;
    }
  }

  private enemyInput(): { turn: number; throttle: number; fire: boolean } {
    const ship = this.enemy;
    const target = this.player;
    const distance = Math.hypot(target.x - ship.x, target.y - ship.y);
    const bearing = normalizeAngle(Math.atan2(target.y - ship.y, target.x - ship.x));

    let desired = bearing;
    let throttle = 0.75;
    if (distance > 270) {
      desired = bearing;
      throttle = 1;
    } else if (distance < 165) {
      desired = bearing + Math.PI;
      throttle = 0.9;
    } else {
      desired = bearing + Math.PI / 2;
      throttle = 0.45;
    }
    const diff = normalizeAngle(desired - ship.heading);
    const turn = clamp(diff * 2.4, -1, 1);
    return { turn, throttle, fire: ship.reload <= 0 && this.inArc(ship, target) };
  }

  private tryFire(from: BattleShip, target: BattleShip, side: 'player' | 'enemy'): void {
    if (from.reload > 0) return;
    if (!this.inArc(from, target)) return;
    const bearing = normalizeAngle(Math.atan2(target.y - from.y, target.x - from.x) - from.heading);
    const beam = bearing >= 0 ? from.heading + Math.PI / 2 : from.heading - Math.PI / 2;
    const muzzle = {
      x: from.x + Math.cos(beam) * 26,
      y: from.y + Math.sin(beam) * 26,
    };
    const attacker = createCombatant({
      id: side,
      hp: from.hp,
      armor: from.armor,
      power: from.power,
      morale: 1,
    });
    const defender = createCombatant({
      id: side === 'player' ? 'enemy' : 'player',
      hp: target.hp,
      armor: target.armor,
      power: target.power,
      morale: 1,
    });
    const damageResult = calculateDamage(attacker, defender, this.rng, side === 'player' ? this.doctrine : 0.05);
    const damage = damageResult.ok ? Math.max(1, damageResult.value.total) : 1;
    const spread = damageResult.ok ? damageResult.value : null;
    const accuracy = spread ? clamp(0.55 + (spread.base - spread.absorbed) / 120, 0.45, 0.9) : 0.6;
    const roll = this.rng.nextFloat(STREAM_NAMES['rng.combat.resolution']);
    const hit = roll.ok ? roll.value < accuracy : true;
    if (hit) target.hp = Math.max(0, target.hp - damage);
    this.shots.push({
      from: side,
      x1: muzzle.x,
      y1: muzzle.y,
      x2: hit ? target.x : target.x + 70,
      y2: hit ? target.y : target.y - 60,
      hit,
      damage: hit ? damage : 0,
    });
    from.reload = from.reloadTime;
  }
}
