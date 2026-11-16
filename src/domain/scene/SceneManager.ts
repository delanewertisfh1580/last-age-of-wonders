import { err, ok, type Result } from '../result/Result.js';

/** TKT-M8-001/003/004/005: сцены, переходы, рендер-цикл и качество. */
export type SceneKind = 'world-map' | 'city' | 'battle' | 'duel' | 'epilogue';
export type QualityTier = 'low' | 'medium' | 'high';

export interface SceneParams {
  readonly [key: string]: string | number | boolean;
}

export interface SceneDefinition {
  readonly kind: SceneKind;
  readonly allowedTransitions: readonly SceneKind[];
  readonly requiredParams: readonly string[];
}

export interface SceneEventScope {
  onEvent(handler: (event: { type: string; scene: SceneKind }) => void): () => void;
  drain(): readonly { type: string; scene: SceneKind }[];
  dispose(): void;
}

export function createSceneEventScope(): SceneEventScope {
  const handlers: ((event: { type: string; scene: SceneKind }) => void)[] = [];
  const pending: { type: string; scene: SceneKind }[] = [];
  return {
    onEvent(handler) {
      handlers.push(handler);
      return () => {
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      };
    },
    drain() {
      const drained = pending.splice(0, pending.length);
      for (const event of drained) for (const handler of handlers) handler(event);
      return drained;
    },
    dispose() {
      handlers.length = 0;
      pending.length = 0;
    },
  };
}

export interface SceneLike {
  readonly kind: SceneKind;
  enter(params: SceneParams): Result<void, SceneError>;
  exit(): void;
  update(dtMs: number): void;
}

export type SceneErrorCode =
  | 'SCENE_UNKNOWN'
  | 'SCENE_TRANSITION_FORBIDDEN'
  | 'SCENE_MISSING_PARAMS'
  | 'SCENE_NOT_ACTIVE'
  | 'SCENE_DUPLICATE';

export interface SceneError {
  readonly code: SceneErrorCode;
  readonly message: string;
}

function fail(code: SceneErrorCode, message: string): Result<never, SceneError> {
  return err({ code, message });
}

export interface SceneManagerDeps {
  readonly afterSceneEvents: () => void;
  readonly onTransition?: (from: SceneKind | null, to: SceneKind, params: SceneParams) => void;
}

export class SceneManager {
  private readonly definitions = new Map<SceneKind, SceneDefinition>();
  private readonly scenes = new Map<SceneKind, SceneLike>();
  private active: SceneLike | null = null;
  private transitioning = false;

  constructor(private readonly deps: SceneManagerDeps) {}

  registerDefinition(definition: SceneDefinition): Result<void, SceneError> {
    if (this.definitions.has(definition.kind)) return fail('SCENE_DUPLICATE', `Duplicate scene: ${definition.kind}`);
    this.definitions.set(definition.kind, definition);
    return ok(undefined);
  }

  registerScene(scene: SceneLike): Result<void, SceneError> {
    if (!this.definitions.has(scene.kind)) return fail('SCENE_UNKNOWN', `No definition for ${scene.kind}`);
    if (this.scenes.has(scene.kind)) return fail('SCENE_DUPLICATE', `Duplicate scene impl: ${scene.kind}`);
    this.scenes.set(scene.kind, scene);
    return ok(undefined);
  }

  current(): SceneKind | null {
    return this.active?.kind ?? null;
  }

  transition(to: SceneKind, params: SceneParams = {}): Result<void, SceneError> {
    const definition = this.definitions.get(to);
    const scene = this.scenes.get(to);
    if (!definition || !scene) return fail('SCENE_UNKNOWN', `Unknown scene: ${to}`);
    if (this.transitioning) return fail('SCENE_TRANSITION_FORBIDDEN', 'Transition already running');
    for (const required of definition.requiredParams) {
      if (params[required] === undefined) return fail('SCENE_MISSING_PARAMS', `Missing param: ${required}`);
    }
    if (this.active) {
      const fromDefinition = this.definitions.get(this.active.kind);
      if (fromDefinition && !fromDefinition.allowedTransitions.includes(to)) {
        return fail('SCENE_TRANSITION_FORBIDDEN', `${this.active.kind} -> ${to}`);
      }
    }
    this.transitioning = true;
    const from = this.active?.kind ?? null;
    try {
      this.active?.exit();
      const entered = scene.enter(params);
      if (!entered.ok) return entered as Result<void, SceneError>;
      this.active = scene;
      this.deps.afterSceneEvents();
      this.deps.onTransition?.(from, to, params);
      return ok(undefined);
    } finally {
      this.transitioning = false;
    }
  }

  update(dtMs: number): Result<void, SceneError> {
    if (!this.active) return fail('SCENE_NOT_ACTIVE', 'No active scene');
    this.active.update(dtMs);
    return ok(undefined);
  }
}

export interface RenderFrame {
  readonly fixedSteps: number;
  readonly alpha: number;
  readonly rendered: boolean;
}

/** TKT-M8-004: фиксированный шаг с интерполяцией и паузой. */
export class RenderPipeline {
  private accumulator = 0;
  private paused = false;
  private readonly stepMs: number;
  private readonly maxSteps: number;

  constructor(stepMs = 1000 / 60, maxSteps = 5) {
    this.stepMs = stepMs;
    this.maxSteps = maxSteps;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  tick(dtMs: number, update: (fixedMs: number) => void): RenderFrame {
    if (this.paused) return { fixedSteps: 0, alpha: this.accumulator / this.stepMs, rendered: false };
    this.accumulator += Math.max(0, dtMs);
    let fixedSteps = 0;
    while (this.accumulator >= this.stepMs && fixedSteps < this.maxSteps) {
      update(this.stepMs);
      this.accumulator -= this.stepMs;
      fixedSteps += 1;
    }
    if (fixedSteps === this.maxSteps) this.accumulator = 0;
    return { fixedSteps, alpha: this.accumulator / this.stepMs, rendered: true };
  }
}

export interface DeviceProfile {
  readonly kind: 'desktop' | 'tablet' | 'mobile';
  readonly gpuScore: number;
  readonly maxTextureSize: number;
}

/** TKT-M8-005: выбор тира качества по профилю устройства. */
export function detectInitialTier(profile: DeviceProfile): QualityTier {
  if (profile.kind === 'mobile') return profile.gpuScore >= 60 ? 'medium' : 'low';
  if (profile.kind === 'tablet') return profile.gpuScore >= 50 ? 'high' : 'medium';
  return profile.gpuScore >= 40 ? 'high' : 'medium';
}

export class QualityTierController {
  private tier: QualityTier;

  constructor(initial: QualityTier) {
    this.tier = initial;
  }

  get(): QualityTier {
    return this.tier;
  }

  set(tier: QualityTier): Result<QualityTier, SceneError> {
    if (!['low', 'medium', 'high'].includes(tier)) return fail('SCENE_UNKNOWN', `Unknown tier: ${tier}`);
    this.tier = tier;
    return ok(tier);
  }

  /** Понижение при перегрузке кадра, повышение — только по явному запросу. */
  adapt(frameMs: number, targetMs = 16): QualityTier {
    if (frameMs > targetMs * 1.8 && this.tier !== 'low') {
      this.tier = this.tier === 'high' ? 'medium' : 'low';
    }
    return this.tier;
  }
}
