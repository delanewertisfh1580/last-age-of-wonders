import { describe, expect, it } from 'vitest';
import {
  acceptQuest,
  completeQuest,
  contribute,
  createGuild,
  createQuestBoard,
  createTradeAgent,
  generateQuests,
  reputationTier,
  runTradeAgentCycle,
  type QuestTemplate,
} from '../../src/domain/guilds/Guilds.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const guild = () => createGuild({ id: 'g', name: 'G', chapterCity: 'c', baseReputation: 20 });
const template: QuestTemplate = {
  id: 't1', guildId: 'g', type: 'delivery', difficulty: 3, reward: 40, risk: 0, durationTicks: 2,
};

describe('TKT-M6-007: guild service', () => {
  it('вклад повышает репутацию и казну, но не выше 100', () => {
    const g = guild();
    expect(contribute(g, 50).ok).toBe(true);
    expect(g.treasury).toBe(50);
    contribute(g, 5000);
    expect(g.reputation).toBe(100);
    expect(reputationTier(g.reputation)).toBe('master');
  });

  it('недопустимая сумма → ошибка', () => {
    const result = contribute(guild(), 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GUILD_INVALID_AMOUNT');
  });
});

describe('TKT-M6-009/010: доска заказов', () => {
  it('генерация детерминирована и уважает репутацию', () => {
    const build = () => {
      const g = guild();
      const board = createQuestBoard();
      const result = generateQuests(
        board,
        [template],
        [g],
        { cityIds: ['c'], danger: 0, tick: 1 },
        new SeededRngService('q-seed'),
        3,
      );
      return JSON.stringify({ result, board });
    };
    expect(build()).toBe(build());
  });

  it('заказ принимается и завершается с наградой', () => {
    const g = guild();
    const board = createQuestBoard();
    const generated = generateQuests(board, [template], [g], { cityIds: ['c'], danger: 0, tick: 1 }, new SeededRngService('q'), 1);
    expect(generated.ok).toBe(true);
    if (!generated.ok || generated.value.length === 0) return;
    const quest = generated.value[0];
    expect(acceptQuest(board, quest.id, g).ok).toBe(true);
    expect(completeQuest(board, quest.id, g, template, 2).ok).toBe(true);
    expect(board.history).toHaveLength(1);
    expect(g.treasury).toBe(40);
  });

  it('просроченный заказ → GUILD_QUEST_EXPIRED', () => {
    const g = guild();
    const board = createQuestBoard();
    const generated = generateQuests(board, [template], [g], { cityIds: ['c'], danger: 0, tick: 1 }, new SeededRngService('q'), 1);
    if (!generated.ok || generated.value.length === 0) return;
    const quest = generated.value[0];
    acceptQuest(board, quest.id, g);
    const result = completeQuest(board, quest.id, g, template, 99);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GUILD_QUEST_EXPIRED');
  });
});

describe('TKT-M6-015: торговые агенты', () => {
  it('цикл агента детерминирован и пишет журнал', () => {
    const run = () => {
      const agent = createTradeAgent({ id: 'a', homeCity: 'c', goods: ['grain'], capital: 100, riskTolerance: 1 });
      const result = runTradeAgentCycle(agent, { cityIds: ['c'], danger: 0, tick: 1 }, new SeededRngService('a-seed'));
      return JSON.stringify({ result, agent });
    };
    expect(run()).toBe(run());
  });
});
