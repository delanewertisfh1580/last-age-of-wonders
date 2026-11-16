import { describe, expect, it } from 'vitest';
import {
  MobilePerformanceGovernor,
  budgetFor,
  detectDeviceProfile,
  tierFor,
} from '../../src/domain/mobile/Performance.js';

describe('TKT-M14-001/002: профили', () => {
  it('детектирует mobile/desktop и выдаёт бюджет', () => {
    const mobile = detectDeviceProfile({ userAgent: 'Android Mobile', touch: true, gpuScore: 20 });
    expect(mobile.kind).toBe('mobile');
    expect(tierFor(mobile)).toBe('low');
    expect(budgetFor(mobile).maxTickMs).toBe(25);
    expect(detectDeviceProfile({ userAgent: 'Linux', gpuScore: 90 }).kind).toBe('desktop');
  });
});

describe('TKT-M14-003/004: губернатор', () => {
  it('деградирует при перерасходе и следит за размером save', () => {
    const profile = detectDeviceProfile({ userAgent: 'Android Mobile', touch: true, gpuScore: 80 });
    const governor = new MobilePerformanceGovernor(profile);
    const before = governor.capture();
    governor.record(100, 100);
    const after = governor.capture();
    expect(after.particleBudget).toBeLessThan(before.particleBudget);
    expect(after.tier).toBe('low');
    expect(governor.validateSave(3 * 1024 * 1024).ok).toBe(false);
    expect(governor.record(-1, 0).ok).toBe(false);
  });
});
