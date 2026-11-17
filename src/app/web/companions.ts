/** Напарники: наём в порту и их влияние на бой и ремонт. */
export interface CompanionDef {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly cost: number;
  readonly perk: string;
  readonly icon: string;
  readonly turnMultiplier?: number;
  readonly reloadMultiplier?: number;
  readonly doctrineBonus?: number;
  readonly repairDiscount?: number;
}

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: 'navigator',
    name: 'Штурман Ирма',
    role: 'штурман',
    cost: 170,
    perk: 'Руль ходит на 35% быстрее',
    icon: '🧭',
    turnMultiplier: 1.35,
  },
  {
    id: 'gunner',
    name: 'Канонир Грот',
    role: 'канонир',
    cost: 210,
    perk: 'Перезарядка на 25% быстрее, залп точнее',
    icon: '💥',
    reloadMultiplier: 0.75,
    doctrineBonus: 0.08,
  },
  {
    id: 'surgeon',
    name: 'Лекарь Вейл',
    role: 'корабельный лекарь',
    cost: 190,
    perk: 'Ремонт корпуса дешевле на 40%',
    icon: '⚕',
    repairDiscount: 0.4,
  },
];

export const COMPANION_BY_ID: Readonly<Record<string, CompanionDef>> = Object.fromEntries(
  COMPANIONS.map((companion) => [companion.id, companion]),
);

export interface CompanionEffects {
  readonly turnMultiplier: number;
  readonly reloadMultiplier: number;
  readonly doctrineBonus: number;
  readonly repairDiscount: number;
}

/** Суммирует эффекты нанятых напарников (множители перемножаются, скидки складываются). */
export function companionEffects(owned: readonly string[]): CompanionEffects {
  let turnMultiplier = 1;
  let reloadMultiplier = 1;
  let doctrineBonus = 0;
  let repairDiscount = 0;
  for (const id of owned) {
    const companion = COMPANION_BY_ID[id];
    if (!companion) continue;
    turnMultiplier *= companion.turnMultiplier ?? 1;
    reloadMultiplier *= companion.reloadMultiplier ?? 1;
    doctrineBonus += companion.doctrineBonus ?? 0;
    repairDiscount += companion.repairDiscount ?? 0;
  }
  return {
    turnMultiplier,
    reloadMultiplier,
    doctrineBonus,
    repairDiscount: Math.min(0.6, repairDiscount),
  };
}
