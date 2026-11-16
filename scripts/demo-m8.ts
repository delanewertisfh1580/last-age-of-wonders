/**
 * TKT-M8-010/011: демо M8 — сцена → переход → рендер-цикл → качество.
 * Запуск: bun scripts/demo-m8.ts
 */
import {
  QualityTierController,
  RenderPipeline,
  SceneManager,
  createSceneEventScope,
  detectInitialTier,
  type SceneKind,
  type SceneLike,
  type SceneParams,
} from '../src/domain/scene/SceneManager.js';

const log: string[] = [];
const scene = (kind: SceneKind): SceneLike => ({
  kind,
  enter: (params: SceneParams) => {
    log.push(`enter:${kind}:${String(params.city ?? '')}`);
    return { ok: true, value: undefined };
  },
  exit: () => log.push(`exit:${kind}`),
  update: () => log.push(`update:${kind}`),
});

const manager = new SceneManager({
  afterSceneEvents: () => log.push('after-scene-drain'),
  onTransition: (from, to) => log.push(`transition:${String(from)}->${to}`),
});
manager.registerDefinition({ kind: 'world-map', allowedTransitions: ['city'], requiredParams: [] });
manager.registerDefinition({ kind: 'city', allowedTransitions: ['world-map', 'battle'], requiredParams: ['city'] });
manager.registerDefinition({ kind: 'battle', allowedTransitions: ['city'], requiredParams: [] });
for (const kind of ['world-map', 'city', 'battle'] as const) manager.registerScene(scene(kind));

const first = manager.transition('world-map');
const toCity = manager.transition('city', { city: 'aurum' });
const toBattle = manager.transition('battle');
const forbidden = manager.transition('world-map');

const pipeline = new RenderPipeline(10, 3);
let updates = 0;
const frame = pipeline.tick(25, () => { updates += 1; });
pipeline.pause();
const paused = pipeline.tick(50, () => { updates += 1; });

const tier = new QualityTierController(detectInitialTier({ kind: 'mobile', gpuScore: 30, maxTextureSize: 2048 }));
const degraded = tier.adapt(40);

const scope = createSceneEventScope();
const unsub = scope.onEvent((event) => log.push(`event:${event.type}`));
unsub();
scope.dispose();

process.stdout.write(`→ переходы: ${[first.ok, toCity.ok, forbidden.ok, toBattle.ok].join(', ')}\n`);
process.stdout.write(`→ render: steps=${frame.fixedSteps} alpha=${frame.alpha.toFixed(2)} paused=${String(!paused.rendered)}\n`);
process.stdout.write(`→ tier: ${tier.get()} (degraded: ${degraded}), updates=${updates}\n`);
process.stdout.write(`→ после сцены: ${String(log.includes('after-scene-drain'))}\n`);

if (!first.ok || !toCity.ok || forbidden.ok || !toBattle.ok || frame.fixedSteps !== 2 || updates !== 2 || degraded !== 'low') {
  process.stderr.write('DEMO M8 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M8 OK — сцены → порядок переходов → фикс. шаг → адаптация качества\n');
