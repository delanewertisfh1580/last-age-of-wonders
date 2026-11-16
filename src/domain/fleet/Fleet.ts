import { err, ok, type Result } from '../result/Result.js';

/** TKT-M15-002/003/004/006: корабли, флот, доктрины и получение. */
export type FactionId = 'merchants' | 'navigators' | 'corsairs' | 'crown';
export type ShipClass = 'sloop' | 'frigate' | 'galleon' | 'manowar';
export type ShipStatus = 'ready' | 'damaged' | 'sinking' | 'sunk';

export interface ShipDefinition {
  readonly id: string;
  readonly faction: FactionId;
  readonly shipClass: ShipClass;
  readonly maxHp: number;
  readonly armor: number;
  readonly speed: number;
  readonly slots: number;
  readonly signature: boolean;
}

export interface ShipRuntime {
  readonly id: string;
  readonly definitionId: string;
  hp: number;
  status: ShipStatus;
  readonly equipped: string[];
}

export interface FleetState {
  readonly faction: FactionId;
  readonly ships: ShipRuntime[];
}

export interface FleetError {
  readonly code: 'FLEET_UNKNOWN' | 'FLEET_FULL' | 'FLEET_SHIP_SUNK' | 'FLEET_SLOT_LIMIT';
  readonly message: string;
}
function fail(code: FleetError['code'], message: string): Result<never, FleetError> {
  return err({ code, message });
}

export function createFleet(faction: FactionId): FleetState {
  return { faction, ships: [] };
}

export function createShip(definition: ShipDefinition, id = `${definition.id}-1`): ShipRuntime {
  return { id, definitionId: definition.id, hp: definition.maxHp, status: 'ready', equipped: [] };
}

export function addShip(fleet: FleetState, definition: ShipDefinition, id?: string): Result<ShipRuntime, FleetError> {
  if (fleet.ships.length >= 12) return fail('FLEET_FULL', 'Fleet is full');
  const ship = createShip(definition, id);
  fleet.ships.push(ship);
  return ok(ship);
}

/** TKT-M15-003: урон с бронёй, статусы и затопление. */
export function applyShipDamage(ship: ShipRuntime, definition: ShipDefinition, rawDamage: number): ShipRuntime {
  if (ship.status === 'sunk') return ship;
  const damage = Math.max(1, Math.round(rawDamage - definition.armor));
  ship.hp = Math.max(0, ship.hp - damage);
  ship.status = ship.hp === 0 ? 'sunk' : ship.hp < definition.maxHp * 0.35 ? 'sinking' : ship.hp < definition.maxHp * 0.7 ? 'damaged' : 'ready';
  return ship;
}

export function repairShip(ship: ShipRuntime, definition: ShipDefinition, amount: number): Result<ShipRuntime, FleetError> {
  if (ship.status === 'sunk') return fail('FLEET_SHIP_SUNK', `Ship ${ship.id} is sunk`);
  ship.hp = Math.min(definition.maxHp, ship.hp + Math.max(0, amount));
  ship.status = ship.hp < definition.maxHp * 0.7 ? 'damaged' : 'ready';
  return ok(ship);
}

export function equipModule(ship: ShipRuntime, definition: ShipDefinition, moduleId: string): Result<ShipRuntime, FleetError> {
  if (ship.equipped.length >= definition.slots) return fail('FLEET_SLOT_LIMIT', `No slots left on ${ship.id}`);
  if (!ship.equipped.includes(moduleId)) ship.equipped.push(moduleId);
  return ok(ship);
}

export interface FleetTotals {
  readonly ships: number;
  readonly ready: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly speed: number;
}

export function fleetTotals(fleet: FleetState, definitions: ReadonlyMap<string, ShipDefinition>): FleetTotals {
  let hp = 0;
  let maxHp = 0;
  let speed = 0;
  let ready = 0;
  for (const ship of fleet.ships) {
    const definition = definitions.get(ship.definitionId);
    if (!definition) continue;
    hp += ship.status === 'sunk' ? 0 : ship.hp;
    maxHp += definition.maxHp;
    if (ship.status === 'ready') ready += 1;
    speed += ship.status === 'sunk' ? 0 : definition.speed;
  }
  return { ships: fleet.ships.length, ready, hp, maxHp, speed };
}

export type DoctrinePhase = 'approach' | 'engagement' | 'boarding' | 'withdrawal';

export interface DoctrineBinding {
  readonly doctrineId: string;
  readonly phase: DoctrinePhase;
  readonly effect: string;
}

/** TKT-M15-004: доктрина активна только в своей фазе. */
export class DoctrineRuntime {
  private readonly bindings: DoctrineBinding[] = [];
  private phase: DoctrinePhase = 'approach';

  bind(binding: DoctrineBinding): void {
    this.bindings.push(binding);
  }

  setPhase(phase: DoctrinePhase): void {
    this.phase = phase;
  }

  currentPhase(): DoctrinePhase {
    return this.phase;
  }

  activeEffects(): readonly string[] {
    return this.bindings.filter((binding) => binding.phase === this.phase).map((binding) => binding.effect);
  }
}

export interface AcquisitionContext {
  readonly reputation: number;
  readonly gold: number;
  readonly unlockedBranches: readonly string[];
}

/** TKT-M15-006: signature-корабли требуют репутацию и ветку. */
export function canAcquireShip(
  definition: ShipDefinition,
  context: AcquisitionContext,
  cost: number,
  requiredBranch?: string,
): Result<boolean, FleetError> {
  if (context.gold < cost) return ok(false);
  if (definition.signature && context.reputation < 60) return ok(false);
  if (requiredBranch && !context.unlockedBranches.includes(requiredBranch)) return ok(false);
  return ok(true);
}
