import { describe, expect, it } from 'vitest';
import {
  applyCasualty,
  captureParty,
  createMember,
  createParty,
  equip,
  paySalaries,
  recruit,
  restoreParty,
  totalAttack,
} from '../../src/domain/party/Party.js';

const member = (id: string, salary = 10) =>
  createMember({ id, name: id, role: 'marine', attack: 10, defense: 5, maxHp: 50, salary, slots: 1 });

describe('TKT-M22: найм и экипировка', () => {
  it('нанимает, ограничивает слоты и считает атаку', () => {
    const party = createParty();
    expect(recruit(party, member('a')).ok).toBe(true);
    expect(equip(party, 'a', 'sword').ok).toBe(true);
    const overflow = equip(party, 'a', 'shield');
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error.code).toBe('PARTY_SLOT_LIMIT');
    expect(totalAttack(party)).toBe(10);
    applyCasualty(party.members[0], 100);
    expect(totalAttack(party)).toBe(0);
  });
});

describe('TKT-M22: зарплата, мораль и снимок', () => {
  it('выплата и невыплата меняют мораль', () => {
    const party = createParty(30);
    recruit(party, member('a'));
    recruit(party, member('b'));
    expect(paySalaries(party).ok).toBe(true);
    expect(party.gold).toBe(10);
    party.gold = 0;
    const unpaid = paySalaries(party);
    expect(unpaid.ok).toBe(false);
    if (!unpaid.ok) expect(unpaid.error.code).toBe('PARTY_GOLD');
    expect(party.morale).toBeLessThan(62);
  });

  it('capture/restore', () => {
    const party = createParty();
    recruit(party, member('a'));
    const snapshot = captureParty(party);
    party.members[0].hp = 1;
    restoreParty(party, snapshot);
    expect(party.members[0].hp).toBe(50);
  });
});
