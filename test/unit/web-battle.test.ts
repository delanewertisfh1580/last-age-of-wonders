import { describe, expect, it } from 'vitest';
import { BattleSim, type BattleConfig } from '../../src/app/web/battle/BattleSim.js';
import { WebRngService } from '../../src/infrastructure/rng/WebRngService.js';

function makeSim(overrides: Partial<BattleConfig> = {}, loot = 100): BattleSim {
  const config: BattleConfig = {
    playerHp: 100,
    playerPower: 16,
    playerArmor: 3,
    enemyName: '«Тестовая Вдова»',
    enemyHp: 60,
    enemyPower: 10,
    enemyArmor: 1,
    turnMultiplier: 1,
    reloadMultiplier: 1,
    doctrine: 0.15,
    ...overrides,
  };
  return new BattleSim(config, new WebRngService('battle-test'), loot);
}

describe('BattleSim', () => {
  it('идёт вперёд по курсу и поворачивает рулём', () => {
    const sim = makeSim();
    const startX = sim.player.x;
    const startY = sim.player.y;
    const startHeading = sim.player.heading;
    for (let i = 0; i < 30; i += 1) {
      sim.update(0.05, { throttle: 1, turn: 1, fire: false });
    }
    expect(Math.hypot(sim.player.x - startX, sim.player.y - startY)).toBeGreaterThan(5);
    expect(sim.player.heading).not.toBe(startHeading);
    expect(sim.player.speed).toBeGreaterThan(0);
  });

  it('стреляет только бортом, в секторе траверза', () => {
    const sim = makeSim();
    sim.player.x = 300;
    sim.player.y = 300;
    sim.player.heading = 0;
    sim.player.reload = 0;
    sim.enemy.x = 520;
    sim.enemy.y = 300;
    sim.enemy.hp = 500;
    sim.enemy.maxHp = 500;

    sim.update(0.02, { throttle: 0, turn: 0, fire: true });
    expect(sim.drainShots().filter((shot) => shot.from === 'player')).toHaveLength(0);

    sim.player.reload = 0;
    sim.enemy.x = 300;
    sim.enemy.y = 470;
    sim.update(0.02, { throttle: 0, turn: 0, fire: true });
    const shots = sim.drainShots().filter((shot) => shot.from === 'player');
    expect(shots.length).toBeGreaterThan(0);
  });

  it('бортовой залп наносит урон и перезаряжается', () => {
    const sim = makeSim();
    sim.player.x = 300;
    sim.player.y = 300;
    sim.player.heading = 0;
    sim.enemy.x = 300;
    sim.enemy.y = 470;
    sim.enemy.hp = 2000;
    sim.enemy.maxHp = 2000;

    for (let i = 0; i < 200; i += 1) {
      sim.update(0.05, { throttle: 0, turn: 0, fire: true });
      sim.enemy.y = 470;
      sim.enemy.x = 300;
    }
    expect(sim.enemy.hp).toBeLessThan(2000);
    expect(sim.player.reload).toBeGreaterThan(0);
  });

  it('победа фиксируется при нулевом корпусе врага, трофеи сохранены', () => {
    const sim = makeSim({ enemyHp: 4, enemyPower: 0.2 });
    sim.player.x = 300;
    sim.player.y = 300;
    sim.player.heading = 0;
    sim.enemy.x = 300;
    sim.enemy.y = 470;
    for (let i = 0; i < 300 && sim.status === 'ongoing'; i += 1) {
      sim.update(0.05, { throttle: 0, turn: 0, fire: true });
      sim.enemy.y = 470;
      sim.enemy.x = 300;
    }
    expect(sim.status).toBe('victory');
    expect(sim.loot).toBe(100);
  });

  it('поражение фиксируется при нулевом корпусе игрока', () => {
    const sim = makeSim({ playerHp: 3, playerArmor: 0, enemyHp: 5000, enemyPower: 40 });
    for (let i = 0; i < 400 && sim.status === 'ongoing'; i += 1) {
      sim.update(0.05, { throttle: 0, turn: 0, fire: false });
    }
    expect(sim.status).toBe('defeat');
    expect(sim.player.hp).toBe(0);
  });

  it('не выпускает корабль за границы арены', () => {
    const sim = makeSim();
    sim.player.x = 95;
    sim.player.y = 95;
    sim.player.heading = Math.PI * 1.25;
    for (let i = 0; i < 60; i += 1) {
      sim.update(0.05, { throttle: 1, turn: 0, fire: false });
    }
    expect(sim.player.x).toBeGreaterThanOrEqual(90);
    expect(sim.player.y).toBeGreaterThanOrEqual(90);
  });
});
