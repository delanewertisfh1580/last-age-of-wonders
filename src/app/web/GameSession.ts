import {
  cargoUsed,
  createInventory,
  executeSpotTrade,
  quotePrice,
  type GoodId,
  type InventoryState,
  type MarketState,
} from '../../domain/economy/Economy.js';
import {
  advancePhase,
  calculateDamage,
  createCombatant,
  createEncounter,
  type EncounterPhase,
  type EncounterState,
} from '../../domain/naval/NavalCombat.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type { RngStreamName } from '../../domain/rng/RngStreamName.js';
import type { RngStreamState } from '../../domain/rng/RngStreamState.js';
import { STREAM_NAMES } from '../../shared/rng/stream-names.js';
import { WebRngService } from '../../infrastructure/rng/WebRngService.js';
import {
  GOODS,
  MAX_CARGO,
  MAX_HULL,
  PORT_BY_ID,
  PORTS,
  SHIP_ARMOR,
  SHIP_POWER,
  START_CARGO,
  START_MONEY,
  START_PORT,
  createPortMarkets,
} from './campaign.js';

export type GameStatus = 'port' | 'combat' | 'gameover';
export type Stance = 'broadside' | 'boarding' | 'evade';

export interface ActionResult {
  readonly ok: boolean;
  readonly message: string;
}

export interface StanceSpec {
  readonly id: Stance;
  readonly label: string;
  readonly hint: string;
  readonly damageOut: number;
  readonly damageIn: number;
  readonly doctrine: number;
}

/** Три тактики на раунд: урон/риск. Значения — множители к слоям урона ядра. */
export const STANCES: readonly StanceSpec[] = [
  {
    id: 'broadside',
    label: 'Борт о борт',
    hint: 'Ровный обмен залпами',
    damageOut: 1,
    damageIn: 1,
    doctrine: 0.15,
  },
  {
    id: 'boarding',
    label: 'Абордаж',
    hint: 'Больше урона, больше риска',
    damageOut: 1.45,
    damageIn: 1.35,
    doctrine: 0.25,
  },
  {
    id: 'evade',
    label: 'Уклонение',
    hint: 'Меньше урона с обеих сторон',
    damageOut: 0.45,
    damageIn: 0.4,
    doctrine: 0,
  },
];

export const STANCE_BY_ID: Readonly<Record<Stance, StanceSpec>> = Object.fromEntries(
  STANCES.map((stance) => [stance.id, stance]),
) as Readonly<Record<Stance, StanceSpec>>;

export const PHASE_LABEL: Readonly<Record<EncounterPhase, string>> = {
  approach: 'Сближение',
  broadside: 'Перестрелка',
  boarding: 'Абордаж',
  resolved: 'Исход',
};

const ENEMY_NAMES: readonly string[] = [
  '«Соляной Кит»',
  '«Ржавый Крюк»',
  '«Тихий Прилив»',
  '«Эфирная Вдова»',
  '«Пепельный Шкив»',
];

export interface SessionSnapshot {
  readonly version: 1;
  readonly seed: string;
  readonly day: number;
  readonly portId: string;
  readonly inventory: InventoryState;
  readonly hull: number;
  readonly maxHull: number;
  readonly cargoCapacity: number;
  readonly status: GameStatus;
  readonly encounter: EncounterState | null;
  readonly enemyMaxHp: number;
  readonly log: readonly string[];
  readonly sunk: number;
  readonly profit: number;
  readonly markets: readonly MarketState[];
}

export interface GoodView {
  readonly id: GoodId;
  readonly name: string;
  readonly icon: string;
  readonly qty: number;
  readonly buy: number;
  readonly sell: number;
  readonly stock: number;
}

export interface PortView {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly x: number;
  readonly y: number;
  readonly current: boolean;
}

export interface EncounterView {
  readonly enemyName: string;
  readonly playerHp: number;
  readonly enemyHp: number;
  readonly enemyMaxHp: number;
  readonly round: number;
  readonly phase: EncounterPhase;
  readonly phaseLabel: string;
  readonly loot: number;
}

export interface GameView {
  readonly day: number;
  readonly portId: string;
  readonly portName: string;
  readonly tagline: string;
  readonly money: number;
  readonly hull: number;
  readonly maxHull: number;
  readonly cargoUsed: number;
  readonly cargoCapacity: number;
  readonly status: GameStatus;
  readonly goods: readonly GoodView[];
  readonly ports: readonly PortView[];
  readonly log: readonly string[];
  readonly encounter: EncounterView | null;
  readonly sunk: number;
  readonly profit: number;
  readonly repairCost: number;
  readonly upgradeCost: number;
  readonly seed: string;
}

function okResult(message: string): ActionResult {
  return { ok: true, message };
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Игровая сессия браузерной демо-кампании: торговля, переходы между портами,
 * морской бой. Использует доменные функции ядра (экономика + морской бой),
 * сериализуется в SessionSnapshot.
 */
export class GameSession {
  private readonly rng: IRngService;
  private markets: Map<string, MarketState>;
  private inventory: InventoryState;

  day: number;
  portId: string;
  hull: number;
  readonly maxHull: number;
  cargoCapacity: number;
  status: GameStatus;
  encounter: EncounterState | null;
  enemyMaxHp: number;
  log: string[];
  sunk: number;
  profit: number;
  readonly seed: string;

  private constructor(seed: string) {
    this.seed = seed;
    this.rng = new WebRngService(seed);
    this.markets = createPortMarkets();
    this.inventory = createInventory(START_MONEY);
    this.day = 1;
    this.portId = START_PORT;
    this.hull = MAX_HULL;
    this.maxHull = MAX_HULL;
    this.cargoCapacity = START_CARGO;
    this.status = 'port';
    this.encounter = null;
    this.enemyMaxHp = 0;
    this.log = ['Капитан, судно в Латунной Гавани. Трюм пуст, касса звенит.'];
    this.sunk = 0;
    this.profit = 0;
  }

  static create(seed = 'captain-1'): GameSession {
    return new GameSession(seed);
  }

  static fromSnapshot(snapshot: SessionSnapshot, rngStates?: Record<string, RngStreamState>): GameSession {
    const session = new GameSession(snapshot.seed);
    session.day = snapshot.day;
    session.portId = PORT_BY_ID[snapshot.portId] ? snapshot.portId : START_PORT;
    session.inventory = {
      money: snapshot.inventory.money,
      items: JSON.parse(JSON.stringify(snapshot.inventory.items)) as InventoryState['items'],
    };
    session.hull = snapshot.hull;
    session.cargoCapacity = snapshot.cargoCapacity;
    session.status = snapshot.status;
    session.encounter = snapshot.encounter
      ? (JSON.parse(JSON.stringify(snapshot.encounter)) as EncounterState)
      : null;
    session.enemyMaxHp = snapshot.enemyMaxHp;
    session.log = [...snapshot.log];
    session.sunk = snapshot.sunk;
    session.profit = snapshot.profit;
    session.markets = new Map(
      snapshot.markets
        .filter((market) => PORT_BY_ID[market.nodeId] !== undefined)
        .map((market) => [market.nodeId, JSON.parse(JSON.stringify(market)) as MarketState]),
    );
    if (session.markets.size === 0) session.markets = createPortMarkets();
    if (rngStates) {
      for (const [stream, state] of Object.entries(rngStates)) {
        session.rng.restoreState(stream as RngStreamName, state);
      }
    }
    if (session.status === 'combat' && !session.encounter) session.status = 'port';
    return session;
  }

  snapshot(): SessionSnapshot {
    return {
      version: 1,
      seed: this.seed,
      day: this.day,
      portId: this.portId,
      inventory: {
        money: this.inventory.money,
        items: JSON.parse(JSON.stringify(this.inventory.items)) as InventoryState['items'],
      },
      hull: this.hull,
      maxHull: this.maxHull,
      cargoCapacity: this.cargoCapacity,
      status: this.status,
      encounter: this.encounter
        ? (JSON.parse(JSON.stringify(this.encounter)) as EncounterState)
        : null,
      enemyMaxHp: this.enemyMaxHp,
      log: [...this.log],
      sunk: this.sunk,
      profit: this.profit,
      markets: [...this.markets.values()].map(
        (market) => JSON.parse(JSON.stringify(market)) as MarketState,
      ),
    };
  }

  rngState(): Record<string, RngStreamState> {
    return this.rng.serializeAll();
  }

  private pushLog(message: string): void {
    this.log.push(message);
    if (this.log.length > 60) this.log = this.log.slice(this.log.length - 60);
  }

  private market(): MarketState {
    const market = this.markets.get(this.portId);
    if (!market) throw new Error(`Нет рынка для порта ${this.portId}`);
    return market;
  }

  repairCost(): number {
    return Math.max(0, this.maxHull - this.hull) * 3;
  }

  upgradeCost(): number {
    return this.cargoCapacity >= MAX_CARGO ? 0 : 90 + (this.cargoCapacity - START_CARGO) * 30;
  }

  view(): GameView {
    const market = this.market();
    const goods: GoodView[] = GOODS.map((good) => {
      const quote = quotePrice(market, good.id);
      const stack = this.inventory.items[good.id];
      return {
        id: good.id,
        name: good.name,
        icon: good.icon,
        qty: stack?.qty ?? 0,
        buy: quote.ok ? quote.value.buy : 0,
        sell: quote.ok ? quote.value.sell : 0,
        stock: market.stock[good.id] ?? 0,
      };
    });
    const port = PORT_BY_ID[this.portId];
    const ports: PortView[] = PORTS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      tagline: entry.tagline,
      x: entry.x,
      y: entry.y,
      current: entry.id === this.portId,
    }));
    const encounter = this.encounter;
    return {
      day: this.day,
      portId: this.portId,
      portName: port?.name ?? '—',
      tagline: port?.tagline ?? '',
      money: this.inventory.money,
      hull: this.hull,
      maxHull: this.maxHull,
      cargoUsed: cargoUsed(this.inventory),
      cargoCapacity: this.cargoCapacity,
      status: this.status,
      goods,
      ports,
      log: [...this.log].slice(-6).reverse(),
      encounter:
        encounter && this.status === 'combat'
          ? {
              enemyName: String(encounter.defender.id).replace(/^pirate:/, ''),
              playerHp: encounter.attacker.hp,
              enemyHp: encounter.defender.hp,
              enemyMaxHp: this.enemyMaxHp,
              round: encounter.round,
              phase: encounter.phase,
              phaseLabel: PHASE_LABEL[encounter.phase],
              loot: this.lootForThisEncounter(),
            }
          : null,
      sunk: this.sunk,
      profit: this.profit,
      repairCost: this.repairCost(),
      upgradeCost: this.upgradeCost(),
      seed: this.seed,
    };
  }

  private lootForThisEncounter(): number {
    return 26 + this.day * 4;
  }

  buy(goodId: GoodId, qty: number): ActionResult {
    if (this.status !== 'port') return fail('Торговать можно только в порту.');
    const market = this.market();
    const quote = quotePrice(market, goodId);
    if (!quote.ok) return fail(quote.error.message);
    const freeCargo = this.cargoCapacity - cargoUsed(this.inventory);
    if (freeCargo <= 0) return fail('Трюм полон.');
    const affordable = Math.floor(this.inventory.money / quote.value.buy);
    if (affordable <= 0) return fail('Не хватает золота даже на одну единицу.');
    const inStock = market.stock[goodId] ?? 0;
    if (inStock <= 0) return fail('На складе не осталось товара.');
    const target = Math.min(qty, freeCargo, affordable, inStock);
    const result = executeSpotTrade({
      market,
      inventory: this.inventory,
      goodId,
      qty: target,
      side: 'buy',
      cargoCapacity: this.cargoCapacity,
    });
    if (!result.ok) {
      if (result.error.code === 'ECON_INSUFFICIENT_STOCK') return fail('На складе не осталось товара.');
      if (result.error.code === 'ECON_INSUFFICIENT_FUNDS') return fail('Не хватает золота на сделку.');
      return fail(result.error.message);
    }
    this.profit = round2(this.profit - result.value.total);
    this.pushLog(`Куплено ${target} × ${GOODS.find((g) => g.id === goodId)?.name ?? goodId} за ${result.value.total}.`);
    return okResult('Сделка закрыта.');
  }

  sell(goodId: GoodId, qty: number): ActionResult {
    if (this.status !== 'port') return fail('Торговать можно только в порту.');
    const market = this.market();
    const stack = this.inventory.items[goodId];
    if (!stack || qty <= 0 || stack.qty < qty) return fail('Столько товара нет в трюме.');
    const result = executeSpotTrade({
      market,
      inventory: this.inventory,
      goodId,
      qty,
      side: 'sell',
      cargoCapacity: this.cargoCapacity,
    });
    if (!result.ok) return fail(result.error.message);
    this.profit = round2(this.profit + result.value.total);
    this.pushLog(`Продано ${qty} × ${GOODS.find((g) => g.id === goodId)?.name ?? goodId} за ${result.value.total}.`);
    return okResult('Сделка закрыта.');
  }

  repair(): ActionResult {
    if (this.status !== 'port') return fail('Ремонт доступен в порту.');
    if (this.hull >= this.maxHull) return fail('Корпус цел, ремонт не нужен.');
    const missing = this.maxHull - this.hull;
    const affordable = Math.min(missing, Math.floor(this.inventory.money / 3));
    if (affordable <= 0) return fail('Не хватает золота даже на одну секцию корпуса.');
    const cost = affordable * 3;
    this.inventory.money = round2(this.inventory.money - cost);
    this.hull += affordable;
    this.profit = round2(this.profit - cost);
    this.pushLog(`Ремонт: +${affordable} корпуса за ${cost}.`);
    return okResult('Корпус залатан.');
  }

  upgradeCargo(): ActionResult {
    if (this.status !== 'port') return fail('Верфь доступна в порту.');
    const cost = this.upgradeCost();
    if (cost === 0) return fail('Трюм уже максимального размера.');
    if (this.inventory.money < cost) return fail(`Нужно ${cost} золота.`);
    this.inventory.money = round2(this.inventory.money - cost);
    this.cargoCapacity += 4;
    this.profit = round2(this.profit - cost);
    this.pushLog(`Трюм расширен до ${this.cargoCapacity} за ${cost}.`);
    return okResult('Трюм расширен.');
  }

  travel(portId: string): ActionResult {
    if (this.status === 'combat') return fail('Сначала закончите бой.');
    if (this.status === 'gameover') return fail('Кампания завершена.');
    if (portId === this.portId) return fail('Вы уже в этом порту.');
    const target = PORT_BY_ID[portId];
    if (!target) return fail('Неизвестный порт.');

    this.day += 1;
    const risk = Math.min(0.66, 0.32 + this.day * 0.006);
    const roll = this.rng.chance(STREAM_NAMES['rng.economy.risk'], risk);
    this.portId = portId;
    if (roll.ok && roll.value) {
      this.beginEncounter();
      return fail('Из тумана выходит чужой парус!');
    }
    this.pushLog(`День ${this.day}: прибыли в ${target.name}.`);
    return okResult(`Прибыли в ${target.name}.`);
  }

  private beginEncounter(): void {
    const nextInt = this.rng.nextInt(STREAM_NAMES['rng.combat.resolution'], 0, 4);
    const extra = nextInt.ok ? nextInt.value : 2;
    const power = 9 + Math.floor(this.day / 5) + extra;
    const enemyHp = Math.min(150, 52 + this.day * 3);
    const namePick = this.rng.pickOne(STREAM_NAMES['rng.narrative.npc_state'], ENEMY_NAMES);
    const name = namePick.ok ? namePick.value : ENEMY_NAMES[0];

    const player = createCombatant({
      id: 'player',
      hp: this.hull,
      armor: SHIP_ARMOR,
      power: SHIP_POWER,
      morale: 1,
      boarding: 1,
    });
    const enemy = createCombatant({
      id: `pirate:${name}`,
      hp: enemyHp,
      armor: 1,
      power,
      morale: 1,
      boarding: 1,
    });
    this.encounter = createEncounter(`enc-${this.day}`, player, enemy);
    this.enemyMaxHp = enemyHp;
    this.status = 'combat';
    this.pushLog(`Пираты ${name} берут на абордаж курс. Корпус ${this.hull}/${this.maxHull}.`);
  }

  strike(stance: Stance): ActionResult {
    const encounter = this.encounter;
    if (!encounter || this.status !== 'combat') return fail('Сейчас нет боя.');
    const spec = STANCE_BY_ID[stance];

    const strikeResult = calculateDamage(encounter.attacker, encounter.defender, this.rng, spec.doctrine);
    if (!strikeResult.ok) return fail(strikeResult.error.message);
    const dealt = Math.max(1, Math.round(strikeResult.value.total * spec.damageOut));
    encounter.defender.hp = Math.max(0, encounter.defender.hp - dealt);

    const counterResult = calculateDamage(encounter.defender, encounter.attacker, this.rng);
    const taken = counterResult.ok
      ? Math.max(0, Math.round(counterResult.value.total * spec.damageIn))
      : 0;
    encounter.attacker.hp = Math.max(0, encounter.attacker.hp - taken);
    encounter.round += 1;
    this.hull = encounter.attacker.hp;

    this.pushLog(`Раунд ${encounter.round} · ${spec.label}: нанесли ${dealt}, получили ${taken}.`);
    if (encounter.phase !== 'boarding') advancePhase(encounter);

    if (encounter.defender.hp <= 0) return this.winEncounter();
    if (encounter.attacker.hp <= 0) return this.loseEncounter();

    const enemyName = String(encounter.defender.id).replace(/^pirate:/, '');
    return okResult(`${enemyName}: корпус ${encounter.defender.hp}/${this.enemyMaxHp}.`);
  }

  private winEncounter(): ActionResult {
    const lootRoll = this.rng.nextInt(STREAM_NAMES['rng.economy.shocks'], 26 + this.day * 2, 48 + this.day * 4);
    const loot = lootRoll.ok ? lootRoll.value : this.lootForThisEncounter();
    this.inventory.money = round2(this.inventory.money + loot);
    this.profit = round2(this.profit + loot);
    this.sunk += 1;
    this.encounter = null;
    this.enemyMaxHp = 0;
    this.status = 'port';
    this.pushLog(`Противник потоплен. Трофеи: ${loot} золота, корпус ${this.hull}/${this.maxHull}.`);
    return okResult(`Победа! Трофеи: ${loot} золота.`);
  }

  private loseEncounter(): ActionResult {
    this.hull = 0;
    this.encounter = null;
    this.enemyMaxHp = 0;
    this.status = 'gameover';
    this.pushLog('Корпус разбит. Кампания завершена — начните новую.');
    return fail('Судно потоплено.');
  }
}
