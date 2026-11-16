/**
 * TKT-M6-018: демо M6 — гильдии → доска заказов → агенты → детерминизм.
 * Запуск: bun scripts/demo-m6.ts
 */
import {
  acceptQuest,
  completeQuest,
  contribute,
  createGuild,
  createQuestBoard,
  createTradeAgent,
  generateQuests,
  runTradeAgentCycle,
  type GuildState,
  type QuestTemplate,
  type TradeAgentState,
} from '../src/domain/guilds/Guilds.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

const guilds = (): GuildState[] => [
  createGuild({ id: 'merchants', name: 'Merchant League', chapterCity: 'aurum', baseReputation: 20 }),
  createGuild({ id: 'navigators', name: 'Navigators', chapterCity: 'porto', baseReputation: 10 }),
];

const templates: readonly QuestTemplate[] = [
  { id: 'q-deliver', guildId: 'merchants', type: 'delivery', difficulty: 2, reward: 30, risk: 0.1, durationTicks: 3 },
  { id: 'q-escort', guildId: 'merchants', type: 'escort', difficulty: 3, reward: 45, risk: 0.25, durationTicks: 4 },
  { id: 'q-bounty', guildId: 'navigators', type: 'bounty', difficulty: 4, reward: 60, risk: 0.35, durationTicks: 5 },
  { id: 'q-smuggle', guildId: 'navigators', type: 'smuggle', difficulty: 5, reward: 80, risk: 0.45, durationTicks: 2 },
];

const agents = (): TradeAgentState[] => [
  createTradeAgent({ id: 'agent-a', homeCity: 'aurum', goods: ['grain', 'iron'], capital: 200, riskTolerance: 0.6 }),
  createTradeAgent({ id: 'agent-b', homeCity: 'porto', goods: ['tools', 'silk'], capital: 150, riskTolerance: 0.4 }),
];

interface Snapshot {
  readonly board: unknown;
  readonly guilds: unknown;
  readonly agents: unknown;
}

function simulate(seed: string): Snapshot {
  const rng = new SeededRngService(seed);
  const state = { board: createQuestBoard(), guilds: guilds(), agents: agents() };
  contribute(state.guilds[0], 50);
  const world = { cityIds: ['aurum', 'porto'], danger: 30, tick: 1 };
  const quests = generateQuests(state.board, templates, state.guilds, world, rng, 4);
  if (!quests.ok) throw new Error(quests.error.message);
  const quest = quests.value[0];
  if (quest) {
    const accepted = acceptQuest(state.board, quest.id, state.guilds.find((g) => g.id === quest.guildId) ?? state.guilds[0]);
    if (accepted.ok) {
      const template = templates.find((t) => t.id === quest.templateId);
      if (template) completeQuest(state.board, quest.id, state.guilds.find((g) => g.id === quest.guildId) ?? state.guilds[0], template, 2);
    }
  }
  for (let tick = 0; tick < 5; tick++) {
    for (const agent of state.agents) runTradeAgentCycle(agent, world, rng);
  }
  return JSON.parse(JSON.stringify(state)) as Snapshot;
}

const first = simulate('guild-seed');
const second = simulate('guild-seed');
process.stdout.write(`→ офферов на доске: ${first.board.offers.length}\n`);
process.stdout.write(`→ репутация merchants: ${first.guilds[0].reputation}\n`);
process.stdout.write(`→ агент a: ${first.agents[0].money}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(first) === JSON.stringify(second))}\n`);

if (JSON.stringify(first) !== JSON.stringify(second)) {
  process.stderr.write('DEMO M6 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M6 OK — гильдии → заказы → агенты → идентичный повтор\n');
