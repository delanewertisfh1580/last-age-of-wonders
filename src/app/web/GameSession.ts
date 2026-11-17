import {
  cargoUsed,
  createInventory,
  executeSpotTrade,
  quotePrice,
  type GoodId,
  type InventoryState,
  type MarketState,
} from '../../domain/economy/Economy.js';
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
import { COMPANIONS, COMPANION_BY_ID, companionEffects, type CompanionDef } from './companions.js';

export type GameStatus = 'port' | 'sailing' | 'combat' | 'gameover';

export interface ActionResult {
  readonly ok: boolean;
  readonly message: string;
}

/** Переход между портами: рендер анимирует progress, сессия решает исход. */
export interface Voyage {
  readonly from: string;
  readonly to: string;
  readonly danger: boolean;
  progress: number;
}

export interface PendingCombat {
  readonly enemyName: string;
  readonly enemyHp: number;
  readonly enemyPower: number;
  readonly enemyArmor: number;
  readonly loot: number;
}

export interface CombatSetup extends PendingCombat {
  readonly playerHull: number;
  readonly playerMaxHull: number;
  readonly playerPower: number;
  readonly playerArmor: number;
  readonly turnMultiplier: number;
  readonly reloadMultiplier: number;
  readonly doctrine: number;
}

export const VOYAGE_SECONDS = 2.8;

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
  readonly voyage?: Voyage | null;
  readonly combat?: PendingCombat | null;
  readonly companions?: readonly string[];
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

export interface CompanionView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly perk: string;
  readonly icon: string;
  readonly cost: number;
  readonly owned: boolean;
  readonly affordable: boolean;
}

export interface VoyageView {
  readonly fromName: string;
  readonly toName: string;
  readonly progress: number;
  readonly danger: boolean;
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
  readonly voyage: VoyageView | null;
  readonly sunk: number;
  readonly profit: number;
  readonly repairCost: number;
  readonly repairCostPerPoint: number;
  readonly upgradeCost: number;
  readonly companions: readonly CompanionView[];
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
 * Игровая сессия кампании: торговля, плавание с анимацией, бой и напарники.
 * Боевая математика — в BattleSim, здесь только состояние кампании и награды.
 */
export class GameSession {
  private readonly rng: IRngService;
  private markets: Map<string, MarketState>;
  private inventory: InventoryState;
  private companions: string[];

  day: number;
  portId: string;
  hull: number;
  readonly maxHull: number;
  cargoCapacity: number;
  status: GameStatus;
  voyage: Voyage | null;
  combat: PendingCombat | null;
  log: string[];
  sunk: number;
  profit: number;
  readonly seed: string;

  private constructor(seed: string) {
    this.seed = seed;
    this.rng = new WebRngService(seed);
    this.markets = createPortMarkets();
    this.inventory = createInventory(START_MONEY);
    this.companions = [];
    this.day = 1;
    this.portId = START_PORT;
    this.hull = MAX_HULL;
    this.maxHull = MAX_HULL;
    this.cargoCapacity = START_CARGO;
    this.status = 'port';
    this.voyage = null;
    this.combat = null;
    this.log = ['Капитан, судно в Латунной Гавани. Трюм пуст, касса звенит.'];
    this.sunk = 0;
    this.profit = 0;
  }

  static create(seed = 'captain-1'): GameSession {
    return new GameSession(seed);
  }

  static fromSnapshot(
    snapshot: SessionSnapshot,
    rngStates?: Record<string, RngStreamState>,
  ): GameSession {
    const session = new GameSession(snapshot.seed);
    session.day = snapshot.day;
    session.portId = PORT_BY_ID[snapshot.portId] ? snapshot.portId : START_PORT;
    session.inventory = {
      money: snapshot.inventory.money,
      items: JSON.parse(JSON.stringify(snapshot.inventory.items)) as InventoryState['items'],
    };
    session.hull = snapshot.hull;
    session.cargoCapacity = snapshot.cargoCapacity;
    session.companions = (snapshot.companions ?? []).filter((id) => COMPANION_BY_ID[id] !== undefined);
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
    // Переход и бой не сохраняются в процессе: возвращаемся в ближайший порт.
    session.status = snapshot.status === 'gameover' ? 'gameover' : 'port';
    session.voyage = null;
    session.combat = null;
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
      voyage: this.voyage ? { ...this.voyage } : null,
      combat: this.combat ? { ...this.combat } : null,
      companions: [...this.companions],
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

  companionEffects() {
    return companionEffects(this.companions);
  }

  ownsCompanion(id: string): boolean {
    return this.companions.includes(id);
  }

  repairCostPerPoint(): number {
    return round2(3 * (1 - this.companionEffects().repairDiscount));
  }

  repairCost(): number {
    return round2(Math.max(0, this.maxHull - this.hull) * this.repairCostPerPoint());
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
    const companions: CompanionView[] = COMPANIONS.map((companion: CompanionDef) => ({
      id: companion.id,
      name: companion.name,
      role: companion.role,
      perk: companion.perk,
      icon: companion.icon,
      cost: companion.cost,
      owned: this.companions.includes(companion.id),
      affordable: this.inventory.money >= companion.cost,
    }));
    const voyage = this.voyage
      ? {
          fromName: PORT_BY_ID[this.voyage.from]?.name ?? '—',
          toName: PORT_BY_ID[this.voyage.to]?.name ?? '—',
          progress: this.voyage.progress,
          danger: this.voyage.danger,
        }
      : null;
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
      voyage,
      sunk: this.sunk,
      profit: this.profit,
      repairCost: this.repairCost(),
      repairCostPerPoint: this.repairCostPerPoint(),
      upgradeCost: this.upgradeCost(),
      companions,
      seed: this.seed,
    };
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
    const perPoint = this.repairCostPerPoint();
    const missing = this.maxHull - this.hull;
    const affordable = Math.min(missing, Math.floor(this.inventory.money / perPoint));
    if (affordable <= 0) return fail('Не хватает золота даже на одну секцию корпуса.');
    const cost = round2(affordable * perPoint);
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

  recruit(id: string): ActionResult {
    if (this.status !== 'port') return fail('Нанимать можно только в порту.');
    const companion = COMPANION_BY_ID[id];
    if (!companion) return fail('Такого напарника нет.');
    if (this.companions.includes(id)) return fail(`${companion.name} уже в команде.`);
    if (this.inventory.money < companion.cost) return fail(`Нужно ${companion.cost} золота.`);
    this.inventory.money = round2(this.inventory.money - companion.cost);
    this.companions.push(id);
    this.profit = round2(this.profit - companion.cost);
    this.pushLog(`${companion.name} нанят(а) за ${companion.cost}. ${companion.perk}.`);
    return okResult(`${companion.name} в команде.`);
  }

  /** Начать переход: обратного пути нет, но и бой решается по прибытии. */
  setSail(portId: string): ActionResult {
    if (this.status !== 'port') return fail('Сначала закончите текущее дело.');
    if (portId === this.portId) return fail('Вы уже в этом порту.');
    const target = PORT_BY_ID[portId];
    if (!target) return fail('Неизвестный порт.');

    this.day += 1;
    const risk = Math.min(0.62, 0.28 + this.day * 0.006);
    const roll = this.rng.chance(STREAM_NAMES['rng.economy.risk'], risk);
    this.voyage = {
      from: this.portId,
      to: portId,
      danger: roll.ok && roll.value,
      progress: 0,
    };
    this.status = 'sailing';
    this.pushLog(`Отходим от ${PORT_BY_ID[this.portId]?.name ?? 'причала'} курсом на ${target.name}.`);
    return okResult(`Курс на ${target.name}.`);
  }

  /** Продвигает переход; вызывается из цикла рендера. */
  tickVoyage(dt: number): 'sailing' | 'arrived' | 'ambush' {
    const voyage = this.voyage;
    if (!voyage || this.status !== 'sailing') return 'sailing';
    voyage.progress = Math.min(1, voyage.progress + dt / VOYAGE_SECONDS);
    if (voyage.progress < 1) return 'sailing';

    this.portId = voyage.to;
    const targetName = PORT_BY_ID[voyage.to]?.name ?? 'порту';
    if (voyage.danger) {
      this.status = 'combat';
      this.combat = this.makeEnemy();
      const enemy = this.combat;
      this.voyage = null;
      this.pushLog(`На траверзе ${enemy.enemyName}: палуба к бою!`);
      return 'ambush';
    }
    this.status = 'port';
    this.voyage = null;
    this.pushLog(`День ${this.day}: ошвартовались в ${targetName}.`);
    return 'arrived';
  }

  private makeEnemy(): PendingCombat {
    const nextInt = this.rng.nextInt(STREAM_NAMES['rng.combat.resolution'], 0, 4);
    const extra = nextInt.ok ? nextInt.value : 2;
    const namePick = this.rng.pickOne(STREAM_NAMES['rng.narrative.npc_state'], ENEMY_NAMES);
    return {
      enemyName: namePick.ok ? namePick.value : ENEMY_NAMES[0],
      enemyHp: Math.min(150, 52 + this.day * 3),
      enemyPower: 9 + Math.floor(this.day / 5) + extra,
      enemyArmor: 1,
      loot: 26 + this.day * 4,
    };
  }

  combatSetup(): CombatSetup | null {
    if (this.status !== 'combat' || !this.combat) return null;
    const effects = this.companionEffects();
    return {
      ...this.combat,
      playerHull: this.hull,
      playerMaxHull: this.maxHull,
      playerPower: SHIP_POWER,
      playerArmor: SHIP_ARMOR,
      turnMultiplier: effects.turnMultiplier,
      reloadMultiplier: effects.reloadMultiplier,
      doctrine: 0.15 + effects.doctrineBonus,
    };
  }

  /** Исход боя: корпус и трофеи переходят в состояние кампании. */
  finishCombat(won: boolean, hullLeft: number): ActionResult {
    if (this.status !== 'combat') return fail('Сейчас нет боя.');
    const pending = this.combat;
    this.combat = null;
    this.hull = Math.max(0, Math.min(this.maxHull, Math.round(hullLeft)));
    if (!won) {
      this.hull = 0;
      this.status = 'gameover';
      this.pushLog('Корпус разбит. Кампания завершена — начните новую.');
      return fail('Судно потоплено.');
    }
    const loot = pending?.loot ?? Math.round(26 + this.day * 4);
    this.inventory.money = round2(this.inventory.money + loot);
    this.profit = round2(this.profit + loot);
    this.sunk += 1;
    this.status = 'port';
    this.pushLog(`Противник потоплен. Трофеи: ${loot} золота, корпус ${this.hull}/${this.maxHull}.`);
    return okResult(`Победа! Трофеи: ${loot} золота.`);
  }
}
