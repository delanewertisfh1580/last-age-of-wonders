/**
 * TKT-M5-020: демо M5 — экономика → сделка → производство → save/load.
 * Запуск: bun scripts/demo-m5.ts
 */
import { bootstrap } from '../src/bootstrap/GameBootstrap.js';
import {
  createInventory,
  createMarket,
  executeSpotTrade,
  quotePrice,
  runProductionChain,
  runTradeAgents,
  type MarketState,
  type TradeAgent,
} from '../src/domain/economy/Economy.js';
import type { IRngService } from '../src/domain/rng/IRngService.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

const prices = { grain: 10, iron: 24, tools: 60 };
const goodsStock = { grain: 120, iron: 80, tools: 20 };
const agents: readonly TradeAgent[] = [
  { id: 'agent-a', goodId: 'grain', budget: 120, risk: 0.9 },
  { id: 'agent-b', goodId: 'iron', budget: 200, risk: 0.7 },
  { id: 'agent-c', goodId: 'tools', budget: 90, risk: 0.5 },
];

interface EconomySnapshot {
  readonly money: number;
  readonly items: unknown;
  readonly stock: Readonly<Record<string, number>>;
}

function simulate(rng: IRngService): EconomySnapshot {
  const market: MarketState = createMarket('port-aurum', prices, goodsStock, { grain: 1, iron: 1, tools: 1.2 }, 0.02);
  const inventory = createInventory(500);
  const bought = executeSpotTrade({ market, inventory, goodId: 'grain', qty: 20, side: 'buy', cargoCapacity: 60 });
  if (!bought.ok) throw new Error(bought.error.message);
  const boughtIron = executeSpotTrade({ market, inventory, goodId: 'iron', qty: 10, side: 'buy', cargoCapacity: 60 });
  if (!boughtIron.ok) throw new Error(boughtIron.error.message);

  const chain = runProductionChain(
    [
      { id: 'smelt-iron', inputs: { iron: 4 }, outputs: { tools: 1 }, ticks: 1 },
      { id: 'forge-tools', inputs: { tools: 1 }, outputs: { grain: 2 }, ticks: 1 },
    ],
    inventory,
    1,
  );
  if (!chain.ok) throw new Error(chain.error.message);

  const agentTick = runTradeAgents(agents, market, inventory, rng);
  if (!agentTick.ok) throw new Error(agentTick.error.message);

  return { money: inventory.money, items: inventory.items, stock: { ...market.stock } };
}

async function main(): Promise<void> {
  const boot = await bootstrap({ env: 'development', contentMode: 'json', contentRoot: 'content' });
  if (!boot.ok) throw new Error(boot.error.message);
  const first = simulate(boot.value.rng);

  const second = simulate(new SeededRngService(boot.value.config.masterSeed));
  const quote = quotePrice(createMarket('port-aurum', prices, goodsStock), 'grain');
  process.stdout.write(`→ цена grain: ${quote.ok ? quote.value.buy : 'n/a'}\n`);
  process.stdout.write(`→ деньги после сделок: ${first.money}\n`);
  process.stdout.write(`→ агентские сделки детерминированы: ${String(JSON.stringify(first) === JSON.stringify(second))}\n`);

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    process.stderr.write('DEMO M5 FAILED: экономика недетерминирована\n');
    process.exit(1);
  }
  process.stdout.write('DEMO M5 OK — рынок → сделка → производство → агенты → идентичный повтор\n');
}

await main();
