import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/app/web/GameSession.js';
import { hasSave, loadSession, saveSession } from '../../src/app/web/persistence.js';
import { companionEffects } from '../../src/app/web/companions.js';
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

const ROUTE = ['grainreach', 'ironcove', 'aetherport', 'veilmarket'] as const;

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
    expect(session.buy('grain', 3).ok).toBe(true);
    const afterBuy = session.view();
    expect(afterBuy.cargoUsed).toBe(3);
    expect(afterBuy.money).toBeLessThan(before.money);
    expect(session.sell('grain', 2).ok).toBe(true);
    expect(session.view().cargoUsed).toBe(1);
  });

  it('не даёт превысить ни трюм, ни кассу', () => {
    const session = GameSession.create('test-1');
    session.buy('grain', 500);
    const view = session.view();
    expect(view.cargoUsed).toBeGreaterThan(0);
    expect(view.cargoUsed).toBeLessThanOrEqual(view.cargoCapacity);
    expect(view.money).toBeGreaterThanOrEqual(0);
  });

  it('переход — это плавание, которое завершается прибытием', () => {
    const session = GameSession.create('test-2');
    const started = session.setSail('grainreach');
    expect(started.ok).toBe(true);
    expect(session.status).toBe('sailing');
    expect(session.view().voyage?.progress).toBe(0);

    const result = session.tickVoyage(1);
    expect(result).toBe('sailing');
    expect(session.view().voyage?.progress).toBeGreaterThan(0);

    const final = session.tickVoyage(10);
    expect(['arrived', 'ambush']).toContain(final);
    expect(session.view().portId).toBe('grainreach');
    expect(session.view().day).toBe(2);
  });

  it('в море нельзя торговать и брать новый курс', () => {
    const session = GameSession.create('test-3');
    session.setSail('ironcove');
    expect(session.buy('grain', 1).ok).toBe(false);
    expect(session.setSail('veilmarket').ok).toBe(false);
  });

  it('опасный переход приводит к бою с настройками и трофеями', () => {
    const session = GameSession.create('test-3');
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 200) {
      if (session.status === 'sailing') {
        session.tickVoyage(10);
        continue;
      }
      if (session.status === 'combat') break;
      session.setSail(ROUTE[guard % ROUTE.length]);
      guard += 1;
    }
    expect(session.view().status).toBe('combat');
    const setup = session.combatSetup();
    expect(setup).not.toBeNull();
    expect(setup?.enemyHp).toBeGreaterThan(0);
    expect(setup?.playerHull).toBeGreaterThan(0);

    const moneyBefore = session.view().money;
    const result = session.finishCombat(true, 55);
    expect(result.ok).toBe(true);
    expect(session.view().status).toBe('port');
    expect(session.view().money).toBeGreaterThan(moneyBefore);
    expect(session.view().sunk).toBe(1);
    expect(session.view().hull).toBe(55);
  });

  it('проигранный бой завершает кампанию', () => {
    const session = GameSession.create('test-3');
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 200) {
      if (session.status === 'sailing') {
        session.tickVoyage(10);
        continue;
      }
      if (session.status === 'combat') break;
      session.setSail(ROUTE[guard % ROUTE.length]);
      guard += 1;
    }
    expect(session.view().status).toBe('combat');
    expect(session.finishCombat(false, 0).ok).toBe(false);
    expect(session.view().status).toBe('gameover');
    expect(session.view().hull).toBe(0);
  });

  it('напарники дают эффекты и удешевляют ремонт', () => {
    const session = GameSession.create('test-7');
    expect(session.recruit('surgeon').ok).toBe(true);
    expect(session.recruit('surgeon').ok).toBe(false);
    expect(session.ownsCompanion('surgeon')).toBe(true);
    expect(session.repairCostPerPoint()).toBeLessThan(3);
    const effects = companionEffects(['navigator', 'gunner']);
    expect(effects.turnMultiplier).toBeGreaterThan(1);
    expect(effects.reloadMultiplier).toBeLessThan(1);
    expect(effects.doctrineBonus).toBeGreaterThan(0);
  });

  it('бой получает бонусы напарников', () => {
    const session = GameSession.create('test-3');
    session.recruit('navigator');
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 200) {
      if (session.status === 'sailing') {
        session.tickVoyage(10);
        continue;
      }
      if (session.status === 'combat') break;
      session.setSail(ROUTE[guard % ROUTE.length]);
      guard += 1;
    }
    const setup = session.combatSetup();
    expect(setup?.turnMultiplier).toBeGreaterThan(1);
  });

  it('ремонт и расширение трюма стоят золота', () => {
    const session = GameSession.create('test-5');
    const cargoBefore = session.view().cargoCapacity;
    expect(session.upgradeCargo().ok).toBe(true);
    expect(session.view().cargoCapacity).toBe(cargoBefore + 4);
    expect(session.repair()).toEqual({ ok: false, message: 'Корпус цел, ремонт не нужен.' });
  });

  it('сохранение и загрузка восстанавливают кампанию', () => {
    const store = storage();
    const session = GameSession.create('test-6');
    session.recruit('navigator');
    session.buy('grain', 2);
    session.upgradeCargo();
    session.setSail('veilmarket');
    session.tickVoyage(10);
    if (session.status === 'combat') session.finishCombat(true, 90);
    const before = session.view();

    expect(saveSession(store, session).ok).toBe(true);
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
    expect(loaded.value.ownsCompanion('navigator')).toBe(true);
  });
});
