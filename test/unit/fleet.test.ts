import { describe, expect, it } from 'vitest';
import {
  DoctrineRuntime,
  addShip,
  applyShipDamage,
  canAcquireShip,
  createFleet,
  equipModule,
  repairShip,
  type ShipDefinition,
} from '../../src/domain/fleet/Fleet.js';

const frigate: ShipDefinition = {
  id: 'f', faction: 'merchants', shipClass: 'frigate', maxHp: 100, armor: 5, speed: 8, slots: 2, signature: false,
};

describe('TKT-M15-003: корабль и флот', () => {
  it('урон учитывает броню, статусы и ремонт', () => {
    const fleet = createFleet('merchants');
    const added = addShip(fleet, frigate);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    applyShipDamage(added.value, frigate, 40);
    expect(added.value.hp).toBe(65);
    expect(added.value.status).toBe('damaged');
    applyShipDamage(added.value, frigate, 1000);
    expect(added.value.status).toBe('sunk');
    expect(repairShip(added.value, frigate, 10).ok).toBe(false);
  });

  it('слоты ограничены', () => {
    const fleet = createFleet('merchants');
    const added = addShip(fleet, frigate);
    if (!added.ok) return;
    expect(equipModule(added.value, frigate, 'a').ok).toBe(true);
    expect(equipModule(added.value, frigate, 'b').ok).toBe(true);
    const overflow = equipModule(added.value, frigate, 'c');
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error.code).toBe('FLEET_SLOT_LIMIT');
  });
});

describe('TKT-M15-004/006: доктрины и acquisition', () => {
  it('эффекты активны только в своей фазе', () => {
    const doctrine = new DoctrineRuntime();
    doctrine.bind({ doctrineId: 'd', phase: 'boarding', effect: 'grapple' });
    expect(doctrine.activeEffects()).toEqual([]);
    doctrine.setPhase('boarding');
    expect(doctrine.activeEffects()).toEqual(['grapple']);
  });

  it('signature-корабль требует репутацию и ветку', () => {
    const signature = { ...frigate, id: 's', signature: true };
    expect(canAcquireShip(signature, { reputation: 20, gold: 999, unlockedBranches: [] }, 100).ok).toBe(true);
    const poorRep = canAcquireShip(signature, { reputation: 20, gold: 999, unlockedBranches: [] }, 100);
    expect(poorRep.ok && poorRep.value).toBe(false);
    const rich = canAcquireShip(signature, { reputation: 90, gold: 999, unlockedBranches: ['naval'] }, 100, 'naval');
    expect(rich.ok && rich.value).toBe(true);
  });
});
