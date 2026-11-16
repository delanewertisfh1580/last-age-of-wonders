/**
 * TKT-M22: демо M22 — найм → экипировка → зарплата → мораль.
 * Запуск: bun scripts/demo-m22.ts
 */
import {
  captureParty,
  createMember,
  createParty,
  equip,
  paySalaries,
  recruit,
  restoreParty,
  totalAttack,
  type PartyState,
} from '../src/domain/party/Party.js';

function buildParty(): PartyState {
  const party = createParty(120);
  recruit(party, createMember({ id: 'cap', name: 'Captain', role: 'captain', attack: 18, defense: 12, maxHp: 100, salary: 20, slots: 3 }));
  recruit(party, createMember({ id: 'doc', name: 'Surgeon', role: 'surgeon', attack: 6, defense: 8, maxHp: 70, salary: 15, slots: 2 }));
  recruit(party, createMember({ id: 'gun', name: 'Gunner', role: 'gunner', attack: 22, defense: 6, maxHp: 75, salary: 18, slots: 2 }));
  equip(party, 'cap', 'sabre');
  equip(party, 'gun', 'long-rifle');
  return party;
}

const party = buildParty();
const paid = paySalaries(party);
const snapshot = captureParty(party);
const attack = totalAttack(party);
party.gold = 0;
const unpaid = paySalaries(party);
const afterUnpaid = party.morale;
restoreParty(party, snapshot);

process.stdout.write(`→ отряд: ${party.members.length}, атака=${attack}\n`);
process.stdout.write(`→ зарплата: ${paid.ok ? paid.value : 'err'}, gold=${party.gold}\n`);
process.stdout.write(`→ невыплата: ${unpaid.ok ? 'ok' : unpaid.error.code}, мораль=${afterUnpaid}\n`);
process.stdout.write(`→ restore: ${JSON.stringify(captureParty(party)) === JSON.stringify(snapshot)}\n`);

if (party.members.length !== 3 || !paid.ok || paid.value !== 53 || unpaid.ok || afterUnpaid >= 62 || JSON.stringify(captureParty(party)) !== JSON.stringify(snapshot)) {
  process.stderr.write('DEMO M22 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M22 OK — найм → экипировка → зарплата → мораль → restore\n');
