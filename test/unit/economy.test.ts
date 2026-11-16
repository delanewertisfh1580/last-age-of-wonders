import { describe, expect, it } from 'vitest';
import {
  createInventory,
  createMarket,
  executeSpotTrade,
  quotePrice,
  reserve,
  runProductionChain,
  runTradeAgents,
} from '../../src/domain/economy/Economy.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const market = () => createMarket('port', { grain: 10, iron: 24 }, { grain: 100, iron: 40 }, { grain: 1, iron: 1 });

describe('TKT-M5-009: PricePolicyResolver', () => {
  it('дефицит повышает цену, избыток понижает', () => {
    const low = quotePrice(createMarket('p', { grain: 10 }, { grain: 5 }), 'grain');
    const high = quotePrice(createMarket('p', { grain: 10 }, { grain: 150 }), 'grain');
    expect(low.ok && high.ok).toBe(true);
    if (low.ok && high.ok) expect(low.value.buy).toBeGreaterThan(high.value.buy);
  });

  it('неизвестный товар → ECON_UNKNOWN_GOOD', () => {
    const result = quotePrice(market(), 'silk');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ECON_UNKNOWN_GOOD');
  });
});

describe('TKT-M5-010/016: инвентарь и spot trade', () => {
  it('покупка меняет деньги, товары и запас рынка', () => {
    const m = market();
    const inv = createInventory(100);
    const trade = executeSpotTrade({ market: m, inventory: inv, goodId: 'grain', qty: 3, side: 'buy' });
    expect(trade.ok).toBe(true);
    if (trade.ok) expect(inv.money).toBeCloseTo(100 - trade.value.total, 2);
    expect(inv.items.grain?.qty).toBe(3);
    expect(m.stock.grain).toBe(97);
  });

  it('недостаточно денег и трюма → ошибки', () => {
    const m = market();
    const poor = createInventory(1);
    const noMoney = executeSpotTrade({ market: m, inventory: poor, goodId: 'grain', qty: 3, side: 'buy' });
    expect(noMoney.ok).toBe(false);
    if (!noMoney.ok) expect(noMoney.error.code).toBe('ECON_INSUFFICIENT_FUNDS');

    const rich = createInventory(1000);
    const noCargo = executeSpotTrade({ market: m, inventory: rich, goodId: 'grain', qty: 3, side: 'buy', cargoCapacity: 1 });
    expect(noCargo.ok).toBe(false);
    if (!noCargo.ok) expect(noCargo.error.code).toBe('ECON_INSUFFICIENT_CARGO');
  });

  it('резерв ограничен свободным остатком', () => {
    const inv = createInventory(20);
    const buy = executeSpotTrade({ market: market(), inventory: inv, goodId: 'grain', qty: 2, side: 'buy' });
    expect(buy.ok).toBe(true);
    expect(reserve(inv, 'grain', 2).ok).toBe(true);
    const overflow = reserve(inv, 'grain', 1);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error.code).toBe('ECON_INVARIANT_VIOLATION');
  });
});

describe('TKT-M5-012: производство', () => {
  it('цепочка выполняется в топологическом порядке', () => {
    const inv = createInventory(0);
    inv.items.iron = { qty: 8, reserved: 0 };
    inv.items.grain = { qty: 4, reserved: 0 };
    const result = runProductionChain(
      [
        { id: 'forge', inputs: { tools: 1 }, outputs: { grain: 3 }, ticks: 1 },
        { id: 'smelt', inputs: { iron: 4 }, outputs: { tools: 1 }, ticks: 1 },
      ],
      inv,
      2,
    );
    expect(result.ok).toBe(true);
    expect(inv.items.grain?.qty).toBe(10);
  });

  it('цикл рецептов → ECON_RECIPE_CYCLE', () => {
    const inv = createInventory(0);
    inv.items.a = { qty: 1, reserved: 0 };
    inv.items.b = { qty: 1, reserved: 0 };
    const result = runProductionChain(
      [
        { id: 'r1', inputs: { a: 1 }, outputs: { b: 1 }, ticks: 1 },
        { id: 'r2', inputs: { b: 1 }, outputs: { a: 1 }, ticks: 1 },
      ],
      inv,
      1,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ECON_RECIPE_CYCLE');
  });
});

describe('TKT-M5-013: торговые агенты', () => {
  it('детерминированы при одинаковом seed', () => {
    const agents = [
      { id: 'a', goodId: 'grain', budget: 100, risk: 1 },
      { id: 'b', goodId: 'iron', budget: 100, risk: 1 },
    ];
    const run = () => {
      const m = market();
      const inv = createInventory(500);
      const result = runTradeAgents(agents, m, inv, new SeededRngService('seed'));
      return { result: JSON.parse(JSON.stringify(result)), inv: JSON.parse(JSON.stringify(inv)) };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.inv.items.grain ?? a.inv.items.iron).toBeTruthy();
  });
});
