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
    prices: { grain: 18, iron: 22, aether: 84 },
    stock: { grain: 46, iron: 130, aether: 18 },
    demand: { grain: 1.15, iron: 0.95, aether: 1.2 },
    tariff: 0.01,
  },
  {
    id: 'grainreach',
    name: 'Хлебный Берег',
    tagline: 'Поля и амбары',
    x: 288,
    y: 424,
    prices: { grain: 11, iron: 34, aether: 92 },
    stock: { grain: 160, iron: 26, aether: 10 },
    demand: { grain: 0.85, iron: 1.15, aether: 1.25 },
    tariff: 0,
  },
  {
    id: 'aetherport',
    name: 'Эфирный Порт',
    tagline: 'Магистериум и обсерватория',
    x: 470,
    y: 116,
    prices: { grain: 24, iron: 38, aether: 52 },
    stock: { grain: 30, iron: 22, aether: 92 },
    demand: { grain: 1.25, iron: 1.2, aether: 0.9 },
    tariff: 0.02,
  },
  {
    id: 'ironcove',
    name: 'Железная Бухта',
    tagline: 'Литейни и верфи',
    x: 646,
    y: 292,
    prices: { grain: 26, iron: 16, aether: 88 },
    stock: { grain: 24, iron: 150, aether: 12 },
    demand: { grain: 1.35, iron: 0.9, aether: 1.2 },
    tariff: 0.01,
  },
  {
    id: 'veilmarket',
    name: 'Рынок Покрова',
    tagline: 'Контрабанда и слухи',
    x: 512,
    y: 470,
    prices: { grain: 20, iron: 30, aether: 96 },
    stock: { grain: 62, iron: 60, aether: 40 },
    demand: { grain: 1.1, iron: 1.05, aether: 1.3 },
    tariff: 0.05,
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
