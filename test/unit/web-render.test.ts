import { beforeAll, describe, expect, it } from 'vitest';
import { WorldRenderer } from '../../src/app/web/render/world.js';
import { BattleSim } from '../../src/app/web/battle/BattleSim.js';
import { WebRngService } from '../../src/infrastructure/rng/WebRngService.js';

interface FakeCanvas {
  clientWidth: number;
  clientHeight: number;
  width: number;
  height: number;
  getContext: () => unknown;
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
}

function makeCanvas(): { canvas: FakeCanvas; calls: string[] } {
  const calls: string[] = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(_target, property: string) {
        return (..._args: unknown[]) => {
          calls.push(property);
          if (property === 'createLinearGradient' || property === 'createRadialGradient') return gradient;
          if (property === 'measureText') return { width: 12 };
          return undefined;
        };
      },
      set() {
        return true;
      },
    },
  );
  const canvas: FakeCanvas = {
    clientWidth: 960,
    clientHeight: 600,
    width: 0,
    height: 0,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
  };
  return { canvas, calls };
}

beforeAll(() => {
  (globalThis as unknown as { window: { devicePixelRatio: number } }).window = { devicePixelRatio: 1 };
});

describe('world renderer', () => {
  it('рисует порт, море и корабль без ошибок', () => {
    const { canvas, calls } = makeCanvas();
    const renderer = new WorldRenderer(canvas as unknown as HTMLCanvasElement);
    renderer.draw(
      { portId: 'brasshaven', status: 'port', voyage: null, battle: null, hullRatio: 1 },
      0.016,
      1.2,
    );
    expect(calls).toContain('fillRect');
    expect(calls).toContain('fillText');
    expect(calls.some((name) => name === 'quadraticCurveTo')).toBe(true);
  });

  it('рисует переход и находит порт по клику', () => {
    const { canvas } = makeCanvas();
    const renderer = new WorldRenderer(canvas as unknown as HTMLCanvasElement);
    renderer.draw(
      {
        portId: 'brasshaven',
        status: 'sailing',
        voyage: { from: 'brasshaven', to: 'aetherport', progress: 0.5 },
        battle: null,
        hullRatio: 0.8,
      },
      0.016,
      3.4,
    );
    const point = renderer.portScreen('aetherport');
    expect(point).not.toBeNull();
    if (!point) return;
    expect(renderer.hitTest(point.x, point.y + 24)).toBe('aetherport');
    expect(renderer.hitTest(5, 5)).toBeNull();
  });

  it('рисует бой с двумя кораблями', () => {
    const { canvas, calls } = makeCanvas();
    const renderer = new WorldRenderer(canvas as unknown as HTMLCanvasElement);
    const sim = new BattleSim(
      {
        playerHp: 100,
        playerPower: 16,
        playerArmor: 3,
        enemyName: '«Тест»',
        enemyHp: 60,
        enemyPower: 10,
        enemyArmor: 1,
      },
      new WebRngService('render-test'),
      50,
    );
    renderer.draw({ portId: 'brasshaven', status: 'combat', voyage: null, battle: sim, hullRatio: 1 }, 0.016, 5);
    expect(calls).toContain('strokeRect');
    expect(calls.some((name) => name === 'arc')).toBe(true);
  });
});
