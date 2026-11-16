import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M7-002/004/005/006: инвестиции, предприятия, шрамы узлов, легальность. */
export interface InvestmentProject {
  readonly id: string;
  readonly cost: number;
  readonly returnPerTick: number;
  readonly durationTicks: number;
  readonly risk: number;
  readonly legality: 'legal' | 'grey' | 'illegal';
}

export interface InvestmentState {
  readonly projectId: string;
  funded: number;
  ticksRemaining: number;
  totalReturn: number;
  status: 'funding' | 'active' | 'done' | 'seized';
}

export interface Enterprise {
  readonly id: string;
  readonly nodeId: string;
  readonly type: 'workshop' | 'warehouse' | 'smuggler_den';
  readonly upkeepPerTick: number;
  readonly incomePerTick: number;
  readonly legality: 'legal' | 'grey' | 'illegal';
}

export interface NodeScar {
  readonly nodeId: string;
  severity: number;
  readonly shock: number;
}

export interface LegalityState {
  heat: number;
  investigations: number;
  fines: number;
}

export type InvestmentErrorCode =
  | 'INVEST_NOT_FOUND'
  | 'INVEST_INVALID_AMOUNT'
  | 'INVEST_ALREADY_DONE'
  | 'INVEST_INSUFFICIENT_FUNDS'
  | 'INVEST_SEIZED';

export interface InvestmentError {
  readonly code: InvestmentErrorCode;
  readonly message: string;
}

function fail(code: InvestmentErrorCode, message: string): Result<never, InvestmentError> {
  return err({ code, message });
}

export function fundProject(
  project: InvestmentProject,
  state: InvestmentState,
  wallet: { money: number },
  amount: number,
): Result<InvestmentState, InvestmentError> {
  if (!Number.isInteger(amount) || amount <= 0) return fail('INVEST_INVALID_AMOUNT', `Invalid amount: ${amount}`);
  if (state.status === 'done' || state.status === 'seized') return fail('INVEST_ALREADY_DONE', 'Project closed');
  if (wallet.money < amount) return fail('INVEST_INSUFFICIENT_FUNDS', 'Not enough funds');
  wallet.money -= amount;
  state.funded += amount;
  if (state.funded >= project.cost) {
    state.status = 'active';
    state.ticksRemaining = project.durationTicks;
  }
  return ok(state);
}

export function createInvestmentState(project: InvestmentProject): InvestmentState {
  return { projectId: project.id, funded: 0, ticksRemaining: 0, totalReturn: 0, status: 'funding' };
}

/** TKT-M7-011: доходность с риском и учётом давления катаклизма. */
export function tickInvestment(
  project: InvestmentProject,
  state: InvestmentState,
  rng: IRngService,
  cataclysmPressure = 0,
): Result<number, InvestmentError> {
  if (state.status !== 'active') return ok(0);
  const stream = makeStreamName('rng.economy.investments');
  const roll = rng.nextFloat(stream);
  if (!roll.ok) return fail('INVEST_NOT_FOUND', roll.error.message);
  if (roll.value < project.risk) {
    state.status = 'seized';
    return ok(0);
  }
  const payout = Math.round(project.returnPerTick * (1 - Math.min(0.5, cataclysmPressure / 100)));
  state.totalReturn += payout;
  state.ticksRemaining -= 1;
  if (state.ticksRemaining <= 0) state.status = 'done';
  return ok(payout);
}

export function createEnterprise(definition: Enterprise): Enterprise {
  return { ...definition };
}

/** TKT-M7-012: шрам узла снижает доход предприятия. */
export function scarMultiplier(scar: NodeScar | undefined): number {
  if (!scar) return 1;
  return Math.max(0.2, 1 - scar.severity * 0.1 - scar.shock / 100);
}

export function enterpriseNet(enterprise: Enterprise, scar?: NodeScar): number {
  return Math.round(enterprise.incomePerTick * scarMultiplier(scar) - enterprise.upkeepPerTick);
}

export function tickEnterprises(
  enterprises: readonly Enterprise[],
  scars: ReadonlyMap<string, NodeScar>,
  wallet: { money: number },
): number {
  let net = 0;
  for (const enterprise of enterprises) {
    const delta = enterpriseNet(enterprise, scars.get(enterprise.nodeId));
    wallet.money += delta;
    net += delta;
  }
  return net;
}

export function createLegalityState(): LegalityState {
  return { heat: 0, investigations: 0, fines: 0 };
}

/** TKT-M7-013: жара растёт от нелегальных предприятий, проверка — штраф. */
export function tickLegality(
  legality: LegalityState,
  enterprises: readonly Enterprise[],
  rng: IRngService,
  wallet: { money: number },
): Result<{ heat: number; inspected: boolean; fine: number }, InvestmentError> {
  const illegal = enterprises.filter((e) => e.legality !== 'legal');
  legality.heat = Math.min(100, legality.heat + illegal.length * 4 - 2);
  const stream = makeStreamName('rng.economy.legality');
  const roll = rng.nextFloat(stream);
  if (!roll.ok) return fail('INVEST_NOT_FOUND', roll.error.message);
  const inspected = legality.heat > 40 && roll.value < legality.heat / 200;
  let fine = 0;
  if (inspected) {
    legality.investigations += 1;
    fine = 20 + legality.heat;
    wallet.money -= fine;
    legality.fines += fine;
    legality.heat = Math.max(0, legality.heat - 30);
  }
  return ok({ heat: legality.heat, inspected, fine });
}

/** TKT-M7-014: давление катаклизма как скрытый хук экономики. */
export function cataclysmPressure(scars: readonly NodeScar[]): number {
  return Math.min(100, scars.reduce((sum, scar) => sum + scar.severity * 5 + scar.shock, 0));
}
