import { err, ok, type Result } from '../result/Result.js';

/** TKT-M22: ростер, экипировка, мораль и зарплата. */
export type PartyRole = 'captain' | 'surgeon' | 'gunner' | 'navigator' | 'marine' | 'quartermaster';

export interface PartyMember {
  readonly id: string;
  readonly name: string;
  readonly role: PartyRole;
  readonly attack: number;
  readonly defense: number;
  readonly maxHp: number;
  hp: number;
  morale: number;
  readonly salary: number;
  readonly slots: number;
  readonly equipment: string[];
}

export interface PartyState {
  readonly members: PartyMember[];
  gold: number;
  morale: number;
  readonly events: string[];
}

export interface PartyError {
  readonly code: 'PARTY_FULL' | 'PARTY_GOLD' | 'PARTY_UNKNOWN_MEMBER' | 'PARTY_SLOT_LIMIT' | 'PARTY_MEMBER_DEAD';
  readonly message: string;
}
function fail(code: PartyError['code'], message: string): Result<never, PartyError> {
  return err({ code, message });
}

export function createMember(input: Omit<PartyMember, 'hp' | 'morale' | 'equipment'> & { morale?: number }): PartyMember {
  return { ...input, hp: input.maxHp, morale: input.morale ?? 60, equipment: [] };
}

export function createParty(gold = 100): PartyState {
  return { members: [], gold, morale: 60, events: [] };
}

export function recruit(party: PartyState, member: PartyMember): Result<PartyMember, PartyError> {
  if (party.members.length >= 8) return fail('PARTY_FULL', 'Party is full');
  if (party.members.some((existing) => existing.id === member.id)) return fail('PARTY_UNKNOWN_MEMBER', `Duplicate ${member.id}`);
  party.members.push(member);
  party.events.push(`recruited:${member.id}`);
  return ok(member);
}

export function equip(party: PartyState, memberId: string, itemId: string): Result<PartyMember, PartyError> {
  const member = party.members.find((entry) => entry.id === memberId);
  if (!member) return fail('PARTY_UNKNOWN_MEMBER', `Unknown member: ${memberId}`);
  if (member.equipment.length >= member.slots) return fail('PARTY_SLOT_LIMIT', `No slots on ${memberId}`);
  if (!member.equipment.includes(itemId)) member.equipment.push(itemId);
  return ok(member);
}

export function totalAttack(party: PartyState): number {
  return party.members.reduce((sum, member) => sum + (member.hp > 0 ? member.attack : 0), 0);
}

/** TKT-M22: зарплата в тик; невыплата снижает мораль и ведёт к уходу. */
export function paySalaries(party: PartyState): Result<number, PartyError> {
  const total = party.members.reduce((sum, member) => sum + member.salary, 0);
  if (party.gold < total) {
    const drop = Math.min(30, 8 + party.members.length);
    party.morale = Math.max(0, party.morale - drop);
    for (const member of party.members) member.morale = Math.max(0, member.morale - drop);
    party.events.push(`unpaid:${total}`);
    const deserters = party.members.filter((member) => member.morale === 0);
    if (deserters.length > 0) {
      for (const deserter of deserters) party.events.push(`deserted:${deserter.id}`);
      party.members.splice(0, party.members.length, ...party.members.filter((member) => member.morale > 0));
    }
    return fail('PARTY_GOLD', `Need ${total}, have ${party.gold}`);
  }
  party.gold -= total;
  party.morale = Math.min(100, party.morale + 2);
  for (const member of party.members) member.morale = Math.min(100, member.morale + 2);
  party.events.push(`paid:${total}`);
  return ok(total);
}

export function changeMorale(party: PartyState, delta: number): number {
  party.morale = Math.max(0, Math.min(100, party.morale + delta));
  party.events.push(`morale:${party.morale}`);
  return party.morale;
}

export function applyCasualty(member: PartyMember, damage: number): PartyMember {
  member.hp = Math.max(0, member.hp - Math.max(0, damage));
  if (member.hp === 0) member.morale = 0;
  return member;
}

export interface PartySnapshot {
  readonly members: readonly PartyMember[];
  readonly gold: number;
  readonly morale: number;
}

export function captureParty(party: PartyState): PartySnapshot {
  return JSON.parse(JSON.stringify({ members: party.members, gold: party.gold, morale: party.morale })) as PartySnapshot;
}

export function restoreParty(party: PartyState, snapshot: PartySnapshot): void {
  party.members.splice(0, party.members.length, ...snapshot.members.map((member) => ({ ...member, equipment: [...member.equipment] })));
  party.gold = snapshot.gold;
  party.morale = snapshot.morale;
}
