import { describe, expect, it } from 'vitest';
import {
  applyCataclysmEffect,
  buildBridge,
  routePassable,
  scarTravelCost,
  type ScarredNode,
} from '../../src/domain/cataclysm/Effects.js';

const node = (): Record<string, ScarredNode> => ({
  n: { nodeId: 'n', population: 1000, wealth: 100, defense: 50, tags: [] },
});

describe('TKT-M21: эффекты и шрамы', () => {
  it('эффект снижает население/богатство и оставляет шрам', () => {
    const nodes = node();
    const scars = new Map();
    const result = applyCataclysmEffect(nodes, scars, {
      id: 'e', type: 'storm', stage: 'impact', nodeId: 'n', populationLoss: 0.1, wealthLoss: 0.2, defenseLoss: 5, severity: 3,
    });
    expect(result.ok).toBe(true);
    expect(nodes.n.population).toBeLessThan(1000);
    expect(nodes.n.tags).toContain('scarred');
    expect(scars.get('n')?.severity).toBe(3);
  });

  it('неизвестный узел и отрицательные потери отклоняются', () => {
    const nodes = node();
    const scars = new Map();
    const missing = applyCataclysmEffect(nodes, scars, {
      id: 'e', type: 'storm', stage: 'impact', nodeId: 'x', populationLoss: 0.1, wealthLoss: 0, defenseLoss: 0, severity: 1,
    });
    expect(missing.ok).toBe(false);
    const invalid = applyCataclysmEffect(nodes, scars, {
      id: 'e', type: 'storm', stage: 'impact', nodeId: 'n', populationLoss: -1, wealthLoss: 0, defenseLoss: 0, severity: 1,
    });
    expect(invalid.ok).toBe(false);
  });
});

describe('TKT-M21: мосты и проходимость', () => {
  it('мост снижает шок и разрешает шрам', () => {
    const nodes = node();
    const scars = new Map();
    applyCataclysmEffect(nodes, scars, {
      id: 'e', type: 'plague', stage: 'impact', nodeId: 'n', populationLoss: 0.1, wealthLoss: 0, defenseLoss: 0, severity: 12,
    });
    const scar = scars.get('n');
    if (!scar) throw new Error('scar missing');
    expect(routePassable(scar)).toBe(false);
    expect(scarTravelCost(scar)).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) buildBridge(scar, nodes.n, 300);
    expect(scar.resolved).toBe(true);
    expect(routePassable(scar)).toBe(true);
  });
});
