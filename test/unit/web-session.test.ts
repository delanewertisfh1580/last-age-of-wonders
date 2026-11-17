import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/app/web/GameSession.js';
import { hasSave, loadSession, saveSession } from '../../src/app/web/persistence.js';
import { MAX_HULL, START_PORT } from '../../src/app/web/campaign.js';

class MemoryStorage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function storage(): Storage {
  return new MemoryStorage() as unknown as Storage;
}

describe('web GameSession', () => {
  it('начинает кампанию в стартовом порту с деньгами и пустым трюмом', () => {
    const session = GameSession.create('test-1');
    const view = session.view();
    expect(view.portId).toBe(START_PORT);
    expect(view.day).toBe(1);
    expect(view.money).toBe(320);
    expect(view.cargoUsed).toBe(0);
    expect(view.hull).toBe(MAX_HULL);
  });

  it('покупает и продаёт товар по ценам рынка', () => {
    const session = GameSession.create('test-1');
    const before = session.view();
    const grainBuy = before.goods.find((good) => good.id === 'grain');
    expect(grainBuy).toBeDefined();

    const buy = session.buy('grain', 3);
    expect(buy.ok).toBe(true);
    const afterBuy = session.view();
    expect(afterBuy.cargoUsed).toBe(3);
    expect(afterBuy.money).toBeLessThan(before.money);

    const sell = session.sell('grain', 2);
    expect(sell.ok).toBe(true);
    expect(session.view().cargoUsed).toBe(1);
  });

  it('не даёт превысить ни вместимость трюма, ни кассу', () => {
    const session = GameSession.create('test-1');
    session.buy('grain', 500);
    const view = session.view();
    expect(view.cargoUsed).toBeGreaterThan(0);
    expect(view.cargoUsed).toBeLessThanOrEqual(view.cargoCapacity);
    expect(view.money).toBeGreaterThanOrEqual(0);
  });

  it('переход в другой порт тратит день и меняет порт', () => {
    const session = GameSession.create('test-2');
    const result = session.travel('grainreach');
    expect(session.view().day).toBe(2);
    expect(session.view().portId).toBe('grainreach');
    expect(typeof result.ok).toBe('boolean');
  });

  it('нельзя торговать во время боя', () => {
    const session = GameSession.create('test-3');
    const route = ['ironcove', 'veilmarket', 'aetherport', 'grainreach'];
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 300) {
      session.travel(route[guard % route.length]);
      guard += 1;
    }
    expect(session.view().status).toBe('combat');
    expect(session.buy('grain', 1).ok).toBe(false);
    expect(session.travel('veilmarket').ok).toBe(false);
  });

  it('бой завершается победой или поражением, корпус обновляется', () => {
    const session = GameSession.create('test-4');
    const route = ['aetherport', 'veilmarket', 'ironcove', 'grainreach'];
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 300) {
      session.travel(route[guard % route.length]);
      guard += 1;
    }
    expect(session.view().status).toBe('combat');
    let rounds = 0;
    while (session.view().status === 'combat' && rounds < 40) {
      session.strike(rounds % 2 === 0 ? 'broadside' : 'boarding');
      rounds += 1;
    }
    const view = session.view();
    expect(view.status === 'port' || view.status === 'gameover').toBe(true);
    if (view.status === 'port') expect(view.sunk).toBeGreaterThan(0);
    else expect(view.hull).toBe(0);
  });

  it('ремонт и расширение трюма стоят золота', () => {
    const session = GameSession.create('test-5');
    const cargoBefore = session.view().cargoCapacity;
    const upgrade = session.upgradeCargo();
    expect(upgrade.ok).toBe(true);
    expect(session.view().cargoCapacity).toBe(cargoBefore + 4);
    expect(session.repair()).toEqual({ ok: false, message: 'Корпус цел, ремонт не нужен.' });
  });

  it('сохранение и загрузка восстанавливают кампанию', () => {
    const store = storage();
    const session = GameSession.create('test-6');
    session.buy('grain', 2);
    session.upgradeCargo();
    session.travel('veilmarket');
    const before = session.view();

    const saved = saveSession(store, session);
    expect(saved.ok).toBe(true);
    expect(hasSave(store)).toBe(true);

    const loaded = loadSession(store);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const after = loaded.value.view();
    expect(after.day).toBe(before.day);
    expect(after.portId).toBe(before.portId);
    expect(after.money).toBe(before.money);
    expect(after.cargoCapacity).toBe(before.cargoCapacity);
    expect(after.goods.map((good) => good.qty)).toEqual(before.goods.map((good) => good.qty));
  });
});
