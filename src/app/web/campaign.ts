import { createMarket, type GoodId, type MarketState } from '../../domain/economy/Economy.js';

/** Товары кампании: зерно → железо → эфир (дешёвое сырьё → дорогая магия). */
export interface GoodDef {
  readonly id: GoodId;
  readonly name: string;
  readonly icon: string;
  readonly base: number;
}

export const GOODS: readonly GoodDef[] = [
  { id: 'grain', name: 'Зерно', icon: '🌾', base: 14 },
  { id: 'iron', name: 'Железо', icon: '⛓', base: 30 },
  { id: 'aether', name: 'Эфир', icon: '✦', base: 72 },
];

export const GOOD_BY_ID: Readonly<Record<string, GoodDef>> = Object.fromEntries(
  GOODS.map((good) => [good.id, good]),
);

export interface PortDef {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly x: number;
  readonly y: number;
  readonly prices: Readonly<Record<GoodId, number>>;
  readonly stock: Readonly<Record<GoodId, number>>;
  readonly demand: Readonly<Record<GoodId, number>>;
  readonly tariff: number;
}

/** Пять портов с разной экономикой: арбитраж между наукой и магией. */
export const PORTS: readonly PortDef[] = [
  {
    id: 'brasshaven',
    name: 'Латунная Гавань',
    tagline: 'Трубы, доки, пар',
    x: 112,
    y: 258,
    prices: { grain: 16, iron: 20, aether: 80 },
    stock: { grain: 50, iron: 80, aether: 20 },
    demand: { grain: 1.1, iron: 1, aether: 1.15 },
    tariff: 0.01,
  },
  {
    id: 'grainreach',
    name: 'Хлебный Берег',
    tagline: 'Поля и амбары',
    x: 288,
    y: 424,
    prices: { grain: 11, iron: 24, aether: 78 },
    stock: { grain: 70, iron: 40, aether: 30 },
    demand: { grain: 0.85, iron: 1.15, aether: 1 },
    tariff: 0,
  },
  {
    id: 'aetherport',
    name: 'Эфирный Порт',
    tagline: 'Магистериум и обсерватория',
    x: 470,
    y: 116,
    prices: { grain: 22, iron: 26, aether: 66 },
    stock: { grain: 30, iron: 60, aether: 70 },
    demand: { grain: 1.2, iron: 1.05, aether: 0.95 },
    tariff: 0.02,
  },
  {
    id: 'ironcove',
    name: 'Железная Бухта',
    tagline: 'Литейни и верфи',
    x: 646,
    y: 292,
    prices: { grain: 14, iron: 18, aether: 70 },
    stock: { grain: 60, iron: 90, aether: 30 },
    demand: { grain: 1, iron: 1.1, aether: 1.1 },
    tariff: 0.01,
  },
  {
    id: 'veilmarket',
    name: 'Рынок Покрова',
    tagline: 'Контрабанда и слухи',
    x: 512,
    y: 470,
    prices: { grain: 18, iron: 26, aether: 70 },
    stock: { grain: 80, iron: 60, aether: 60 },
    demand: { grain: 1, iron: 1.05, aether: 1.3 },
    tariff: 0.06,
  },
];

export const PORT_BY_ID: Readonly<Record<string, PortDef>> = Object.fromEntries(
  PORTS.map((port) => [port.id, port]),
);

/** Рынок каждого порта в начальном состоянии кампании. */
export function createPortMarkets(): Map<string, MarketState> {
  const markets = new Map<string, MarketState>();
  for (const port of PORTS) {
    markets.set(port.id, createMarket(port.id, port.prices, port.stock, port.demand, port.tariff));
  }
  return markets;
}

export const START_PORT = 'brasshaven';
export const START_MONEY = 320;
export const MAX_HULL = 100;
export const START_CARGO = 20;
export const MAX_CARGO = 40;
export const SHIP_POWER = 16;
export const SHIP_ARMOR = 3;
