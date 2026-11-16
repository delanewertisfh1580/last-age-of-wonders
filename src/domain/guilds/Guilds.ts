import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M6-002/003/004: гильдии, шаблоны заказов и торговые агенты. */
export type QuestType = 'delivery' | 'escort' | 'bounty' | 'smuggle' | 'exploration' | 'diplomacy';

export interface GuildDefinition {
  readonly id: string;
  readonly name: string;
  readonly chapterCity: string;
  readonly baseReputation: number;
}

export interface GuildState {
  readonly id: string;
  reputation: number;
  treasury: number;
  readonly ranks: string[];
}

export interface QuestTemplate {
  readonly id: string;
  readonly guildId: string;
  readonly type: QuestType;
  readonly difficulty: number;
  readonly reward: number;
  readonly risk: number;
  readonly durationTicks: number;
}

export type QuestStatus = 'offered' | 'accepted' | 'completed' | 'failed';

export interface QuestInstance {
  readonly id: string;
  readonly templateId: string;
  readonly guildId: string;
  status: QuestStatus;
  readonly deadlineTick: number;
  progress: number;
}

export interface QuestBoardState {
  readonly offers: QuestInstance[];
  readonly active: QuestInstance[];
  readonly history: QuestInstance[];
  nextId: number;
}

export interface WorldContextPort {
  readonly cityIds: readonly string[];
  readonly danger: number;
  readonly tick: number;
}

export type GuildErrorCode =
  | 'GUILD_NOT_FOUND'
  | 'GUILD_REPUTATION_TOO_LOW'
  | 'GUILD_QUEST_NOT_OFFERED'
  | 'GUILD_QUEST_EXPIRED'
  | 'GUILD_INVALID_AMOUNT';

export interface GuildError {
  readonly code: GuildErrorCode;
  readonly message: string;
}

function fail(code: GuildErrorCode, message: string): Result<never, GuildError> {
  return err({ code, message });
}

export function createGuild(definition: GuildDefinition): GuildState {
  return { id: definition.id, reputation: definition.baseReputation, treasury: 0, ranks: ['member'] };
}

export function reputationTier(reputation: number): 'outsider' | 'member' | 'officer' | 'master' {
  if (reputation >= 80) return 'master';
  if (reputation >= 45) return 'officer';
  if (reputation >= 15) return 'member';
  return 'outsider';
}

/** TKT-M6-007: вклад в казну повышает репутацию, но не выше 100. */
export function contribute(guild: GuildState, amount: number): Result<number, GuildError> {
  if (!Number.isFinite(amount) || amount <= 0) return fail('GUILD_INVALID_AMOUNT', `Invalid amount: ${amount}`);
  guild.treasury += amount;
  guild.reputation = Math.min(100, guild.reputation + Math.ceil(amount / 25));
  return ok(guild.reputation);
}

export function acceptQuest(board: QuestBoardState, questId: string, guild: GuildState): Result<QuestInstance, GuildError> {
  const index = board.offers.findIndex((quest) => quest.id === questId);
  if (index < 0) return fail('GUILD_QUEST_NOT_OFFERED', `Quest not offered: ${questId}`);
  const quest = board.offers[index];
  if (quest.guildId !== guild.id) return fail('GUILD_REPUTATION_TOO_LOW', 'Quest belongs to another guild');
  if (reputationTier(guild.reputation) === 'outsider') {
    return fail('GUILD_REPUTATION_TOO_LOW', `Reputation too low: ${guild.reputation}`);
  }
  board.offers.splice(index, 1);
  quest.status = 'accepted';
  board.active.push(quest);
  return ok(quest);
}

/** TKT-M6-009/013: завершение заказа меняет репутацию и казну. */
export function completeQuest(
  board: QuestBoardState,
  questId: string,
  guild: GuildState,
  template: QuestTemplate,
  tick: number,
): Result<QuestInstance, GuildError> {
  const index = board.active.findIndex((quest) => quest.id === questId);
  if (index < 0) return fail('GUILD_QUEST_NOT_OFFERED', `Quest not active: ${questId}`);
  const quest = board.active[index];
  if (tick > quest.deadlineTick) {
    quest.status = 'failed';
    board.active.splice(index, 1);
    board.history.push(quest);
    return fail('GUILD_QUEST_EXPIRED', `Quest expired at ${quest.deadlineTick}`);
  }
  quest.status = 'completed';
  board.active.splice(index, 1);
  board.history.push(quest);
  guild.reputation = Math.min(100, guild.reputation + Math.ceil(template.difficulty / 2));
  guild.treasury += template.reward;
  return ok(quest);
}

export function createQuestBoard(): QuestBoardState {
  return { offers: [], active: [], history: [], nextId: 1 };
}

/** TKT-M6-010: генератор заказов из шаблонов и мирового контекста. */
export function generateQuests(
  board: QuestBoardState,
  templates: readonly QuestTemplate[],
  guilds: readonly GuildState[],
  world: WorldContextPort,
  rng: IRngService,
  count = 3,
): Result<readonly QuestInstance[], GuildError> {
  if (templates.length === 0) return ok([]);
  const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
  const stream = makeStreamName('rng.guild.quest_board');
  const offers: QuestInstance[] = [];
  for (let i = 0; i < count; i++) {
    const templateResult = rng.pickOne(stream, templates);
    if (!templateResult.ok) return fail('GUILD_NOT_FOUND', templateResult.error.message);
    const template = templateResult.value;
    const guild = guildById.get(template.guildId);
    if (!guild || reputationTier(guild.reputation) === 'outsider') continue;
    const routeRisk = Math.min(1, template.risk + world.danger / 100);
    const roll = rng.nextFloat(stream);
    if (!roll.ok) return fail('GUILD_NOT_FOUND', roll.error.message);
    if (roll.value < routeRisk * 0.25) continue;
    const quest: QuestInstance = {
      id: `quest-${board.nextId++}`,
      templateId: template.id,
      guildId: template.guildId,
      status: 'offered',
      deadlineTick: world.tick + template.durationTicks + 2,
      progress: 0,
    };
    board.offers.push(quest);
    offers.push(quest);
  }
  return ok(offers);
}

export interface TradeAgentDefinition {
  readonly id: string;
  readonly homeCity: string;
  readonly goods: readonly string[];
  readonly capital: number;
  readonly riskTolerance: number;
}

export interface TradeAgentState {
  readonly definition: TradeAgentDefinition;
  money: number;
  readonly cargo: Record<string, number>;
  readonly log: string[];
}

export type AgentOutcome = { readonly kind: 'profit'; readonly amount: number } | { readonly kind: 'loss'; readonly amount: number } | { readonly kind: 'idle' };

/** TKT-M6-015: один цикл торгового агента с риск-развилкой. */
export function runTradeAgentCycle(
  agent: TradeAgentState,
  world: WorldContextPort,
  rng: IRngService,
): Result<AgentOutcome, GuildError> {
  const stream = makeStreamName('rng.guild.trade_agents');
  const goodResult = rng.pickOne(stream, agent.definition.goods);
  if (!goodResult.ok) return ok({ kind: 'idle' });
  const good = goodResult.value;
  const roll = rng.nextFloat(stream);
  if (!roll.ok) return fail('GUILD_INVALID_AMOUNT', roll.error.message);
  const baseRisk = world.danger / 100 + (1 - agent.definition.riskTolerance) * 0.3;
  if (roll.value < baseRisk) {
    const loss = Math.min(agent.money, Math.round(agent.definition.capital * 0.15));
    agent.money -= loss;
    agent.log.push(`loss:${good}:${loss}`);
    return ok({ kind: 'loss', amount: loss });
  }
  const margin = Math.round(agent.definition.capital * (0.05 + roll.value * 0.1));
  agent.money += margin;
  agent.cargo[good] = (agent.cargo[good] ?? 0) + 1;
  agent.log.push(`profit:${good}:${margin}`);
  return ok({ kind: 'profit', amount: margin });
}

export function createTradeAgent(definition: TradeAgentDefinition): TradeAgentState {
  return { definition, money: definition.capital, cargo: {}, log: [] };
}
