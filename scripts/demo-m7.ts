/**
 * TKT-M7-018: демо M7 — инвестиции → предприятия → легальность.
 * Запуск: bun scripts/demo-m7.ts
 */
import {
  cataclysmPressure,
  createEnterprise,
  createInvestmentState,
  createLegalityState,
  enterpriseNet,
  fundProject,
  tickEnterprises,
  tickInvestment,
  tickLegality,
  type Enterprise,
  type InvestmentProject,
  type NodeScar,
} from '../src/domain/investment/Investment.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

const project: InvestmentProject = {
  id: 'glassworks', cost: 200, returnPerTick: 30, durationTicks: 4, risk: 0.05, legality: 'legal',
};
const enterprises: readonly Enterprise[] = [
  createEnterprise({ id: 'shop', nodeId: 'aurum', type: 'workshop', upkeepPerTick: 8, incomePerTick: 26, legality: 'legal' }),
  createEnterprise({ id: 'den', nodeId: 'porto', type: 'smuggler_den', upkeepPerTick: 10, incomePerTick: 45, legality: 'illegal' }),
];
const scar: NodeScar = { nodeId: 'porto', severity: 3, shock: 15 };

function simulate(seed: string): unknown {
  const rng = new SeededRngService(seed);
  const wallet = { money: 400 };
  const state = createInvestmentState(project);
  fundProject(project, state, wallet, 200);
  const payouts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const payout = tickInvestment(project, state, rng, cataclysmPressure([scar]));
    if (!payout.ok) throw new Error(payout.error.message);
    payouts.push(payout.value);
  }
  const legality = createLegalityState();
  const net = tickEnterprises(enterprises, new Map([[scar.nodeId, scar]]), wallet);
  for (let i = 0; i < 8; i++) {
    const inspection = tickLegality(legality, enterprises, rng, wallet);
    if (!inspection.ok) throw new Error(inspection.error.message);
  }
  return JSON.parse(JSON.stringify({ wallet, state, payouts, legality, net, enterpriseNet: enterpriseNet(enterprises[1], scar) }));
}

const a = simulate('invest-seed');
const b = simulate('invest-seed');
process.stdout.write(`→ выплаты проекта: ${(a as { payouts: number[] }).payouts.join(', ')}\n`);
process.stdout.write(`→ штрафы легальности: ${(a as { legality: { fines: number } }).legality.fines}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M7 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M7 OK — инвестиции → предприятия → шрамы → легальность\n');
