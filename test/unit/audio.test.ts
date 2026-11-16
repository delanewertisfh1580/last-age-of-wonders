import { describe, expect, it } from 'vitest';
import { AudioMixerService, AudioSfxService, MusicStateController } from '../../src/domain/audio/Audio.js';

describe('TKT-M12-002/003: микшер и музыка', () => {
  it('громкость валидируется, duck и mute влияют на effective', () => {
    const mixer = new AudioMixerService();
    expect(mixer.setVolume('music', 1.5).ok).toBe(false);
    mixer.setVolume('music', 0.5);
    const normal = mixer.effective('music');
    mixer.duckMusic(0.2);
    expect(mixer.effective('music')).toBeLessThan(normal);
    mixer.restoreDuck();
    mixer.mute('music', true);
    expect(mixer.effective('music')).toBe(0);
    mixer.restore(mixer.snapshot());
  });

  it('переход музыки доходит до 1', () => {
    const music = new MusicStateController();
    music.play('combat', 100);
    expect(music.tick(50)).toBe(0.5);
    expect(music.tick(50)).toBe(1);
    expect(music.current()).toBe('combat');
  });
});

describe('TKT-M12-004: SFX', () => {
  it('кулдаун и бюджет одновременных', () => {
    const sfx = new AudioSfxService(1);
    const def = { id: 'hit', bus: 'sfx' as const, cooldownMs: 100, weight: 1 };
    expect(sfx.trigger(def, 0).ok).toBe(true);
    expect(sfx.trigger(def, 50).ok).toBe(false);
    expect(sfx.trigger({ ...def, id: 'other' }, 55).ok).toBe(false);
    expect(sfx.trigger({ ...def, id: 'later' }, 500).ok).toBe(true);
  });
});
