import { describe, expect, it } from 'vitest';
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
  type InvestmentProject,
} from '../../src/domain/investment/Investment.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const project: InvestmentProject = {
  id: 'p', cost: 100, returnPerTick: 20, durationTicks: 2, risk: 0, legality: 'legal',
};

describe('TKT-M7-010/011: инвестиции', () => {
  it('полное финансирование активирует проект, тики приносят доход', () => {
    const state = createInvestmentState(project);
    const wallet = { money: 150 };
    expect(fundProject(project, state, wallet, 100).ok).toBe(true);
    expect(state.status).toBe('active');
    const rng = new SeededRngService('i');
    expect(tickInvestment(project, state, rng)).toEqual({ ok: true, value: 20 });
    expect(tickInvestment(project, state, rng)).toEqual({ ok: true, value: 20 });
    expect(state.status).toBe('done');
    expect(state.totalReturn).toBe(40);
  });

  it('недостаточно средств → INVEST_INSUFFICIENT_FUNDS', () => {
    const state = createInvestmentState(project);
    const result = fundProject(project, state, { money: 10 }, 20);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVEST_INSUFFICIENT_FUNDS');
  });
});

describe('TKT-M7-012: предприятия и шрамы', () => {
  it('шрам снижает чистый доход', () => {
    const enterprise = createEnterprise({ id: 'e', nodeId: 'n', type: 'workshop', upkeepPerTick: 5, incomePerTick: 30, legality: 'legal' });
    expect(enterpriseNet(enterprise)).toBe(25);
    expect(enterpriseNet(enterprise, { nodeId: 'n', severity: 4, shock: 20 })).toBeLessThan(25);
  });

  it('тик предприятий меняет кошелёк', () => {
    const wallet = { money: 100 };
    const net = tickEnterprises([
      createEnterprise({ id: 'e', nodeId: 'n', type: 'warehouse', upkeepPerTick: 5, incomePerTick: 10, legality: 'legal' }),
    ], new Map(), wallet);
    expect(net).toBe(5);
    expect(wallet.money).toBe(105);
  });
});

describe('TKT-M7-013/014: легальность и давление', () => {
  it('нелегальные предприятия повышают жару, проверка штрафует', () => {
    const legality = createLegalityState();
    const enterprises = [
      createEnterprise({ id: 'a', nodeId: 'n', type: 'smuggler_den', upkeepPerTick: 0, incomePerTick: 1, legality: 'illegal' }),
      createEnterprise({ id: 'b', nodeId: 'n', type: 'smuggler_den', upkeepPerTick: 0, incomePerTick: 1, legality: 'illegal' }),
    ];
    const wallet = { money: 1000 };
    let heat = 0;
    for (let i = 0; i < 5; i++) {
      const result = tickLegality(legality, enterprises, new SeededRngService(`l-${i}`), wallet);
      expect(result.ok).toBe(true);
      heat = legality.heat;
    }
    expect(heat).toBeGreaterThan(0);
    expect(cataclysmPressure([{ nodeId: 'n', severity: 2, shock: 10 }])).toBe(20);
  });
});
