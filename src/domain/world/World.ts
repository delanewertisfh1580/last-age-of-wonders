import { err, ok, type Result } from '../result/Result.js';

/** TKT-M18: города, отношения, войны и контроль марок. */
export interface CityNode {
  readonly id: string;
  readonly name: string;
  faction: string;
  population: number;
  wealth: number;
  defense: number;
  readonly tradeRoutes: string[];
}

export interface WorldState {
  readonly cities: Record<string, CityNode>;
  /** relations[a][b] — отношение a к b в [-100, 100]. */
  readonly relations: Record<string, Record<string, number>>;
  readonly wars: [string, string][];
  readonly marks: Record<string, string>;
}

export interface WorldError {
  readonly code: 'WORLD_UNKNOWN_CITY' | 'WORLD_UNKNOWN_FACTION' | 'WORLD_INVALID_RELATION';
  readonly message: string;
}
function fail(code: WorldError['code'], message: string): Result<never, WorldError> {
  return err({ code, message });
}

export function createWorld(cities: readonly CityNode[], initialRelations: Record<string, Record<string, number>> = {}): WorldState {
  const cityMap: Record<string, CityNode> = {};
  for (const city of cities) cityMap[city.id] = { ...city, tradeRoutes: [...city.tradeRoutes] };
  return { cities: cityMap, relations: JSON.parse(JSON.stringify(initialRelations)), wars: [], marks: {} };
}

export function relation(world: WorldState, from: string, to: string): number {
  return world.relations[from]?.[to] ?? 0;
}

/** TKT-M18: изменение отношений с ограничением диапазона. */
export function adjustRelation(world: WorldState, from: string, to: string, delta: number): Result<number, WorldError> {
  if (!world.cities[from] || !world.cities[to]) return fail('WORLD_UNKNOWN_CITY', `Unknown city: ${from}/${to}`);
  if (!Number.isFinite(delta)) return fail('WORLD_INVALID_RELATION', `Invalid delta: ${delta}`);
  world.relations[from] ??= {};
  world.relations[to] ??= {};
  world.relations[from][to] = clamp(relation(world, from, to) + delta, -100, 100);
  world.relations[to][from] = clamp(relation(world, to, from) + Math.round(delta * 0.6), -100, 100);
  if (world.relations[from][to] <= -60 && !isAtWar(world, from, to)) {
    world.wars.push([from, to]);
  }
  return ok(world.relations[from][to]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isAtWar(world: WorldState, a: string, b: string): boolean {
  return world.wars.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function declareWar(world: WorldState, a: string, b: string): Result<void, WorldError> {
  if (!world.cities[a] || !world.cities[b]) return fail('WORLD_UNKNOWN_CITY', `Unknown city: ${a}/${b}`);
  if (!isAtWar(world, a, b)) world.wars.push([a, b]);
  adjustRelation(world, a, b, -40);
  return ok(undefined);
}

export function makePeace(world: WorldState, a: string, b: string): Result<void, WorldError> {
  if (!world.cities[a] || !world.cities[b]) return fail('WORLD_UNKNOWN_CITY', `Unknown city: ${a}/${b}`);
  world.wars.splice(0, world.wars.length, ...world.wars.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))));
  world.relations[a] ??= {};
  world.relations[b] ??= {};
  world.relations[a][b] = Math.max(-40, relation(world, a, b) + 25);
  world.relations[b][a] = Math.max(-40, relation(world, b, a) + 25);
  return ok(undefined);
}

/** TKT-M18: влияние меняет контроль марки. */
export function contestMark(world: WorldState, markId: string, faction: string, influence: number): string {
  if (influence >= 50) world.marks[markId] = faction;
  else if (influence <= -50) world.marks[markId] = 'neutral';
  return world.marks[markId] ?? 'neutral';
}

export interface WorldTickReport {
  readonly growth: Record<string, number>;
  readonly battles: readonly { a: string; b: string; winner: string }[];
}

/** TKT-M18: детерминированный тик мира — рост, война, контроль. */
export function tickWorld(world: WorldState, rngSeed?: (cityId: string) => number): WorldTickReport {
  const growth: Record<string, number> = {};
  const battles: { a: string; b: string; winner: string }[] = [];
  for (const city of Object.values(world.cities)) {
    const multiplier = rngSeed ? 0.9 + rngSeed(city.id) * 0.2 : 1;
    const delta = Math.round(city.population * 0.01 * multiplier + city.wealth * 0.001);
    city.population += delta;
    growth[city.id] = delta;
  }
  for (const [a, b] of world.wars) {
    const cityA = world.cities[a];
    const cityB = world.cities[b];
    if (!cityA || !cityB) continue;
    const powerA = cityA.defense + cityA.population * 0.02;
    const powerB = cityB.defense + cityB.population * 0.02;
    const winner = powerA === powerB ? 'draw' : powerA > powerB ? a : b;
    if (winner !== 'draw') {
      const loser = winner === a ? b : a;
      world.cities[loser].wealth = Math.max(0, Math.round(world.cities[loser].wealth * 0.95));
    }
    battles.push({ a, b, winner });
  }
  return { growth, battles };
}

export interface WorldSnapshot {
  readonly cities: Record<string, CityNode>;
  readonly relations: Record<string, Record<string, number>>;
  readonly wars: [string, string][];
  readonly marks: Record<string, string>;
}

export function captureWorld(world: WorldState): WorldSnapshot {
  return JSON.parse(JSON.stringify(world)) as WorldSnapshot;
}

export function restoreWorld(world: WorldState, snapshot: WorldSnapshot): void {
  for (const id of Object.keys(world.cities)) delete world.cities[id];
  Object.assign(world.cities, snapshot.cities);
  for (const id of Object.keys(world.relations)) delete world.relations[id];
  Object.assign(world.relations, snapshot.relations);
  world.wars.splice(0, world.wars.length, ...snapshot.wars);
  for (const id of Object.keys(world.marks)) delete world.marks[id];
  Object.assign(world.marks, snapshot.marks);
}
