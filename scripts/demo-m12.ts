/**
 * TKT-M12-006: демо M12 — шины → duck → музыка → SFX.
 * Запуск: bun scripts/demo-m12.ts
 */
import { AudioMixerService, AudioSfxService, MusicStateController } from '../src/domain/audio/Audio.js';

const mixer = new AudioMixerService();
const music = new MusicStateController();
const sfx = new AudioSfxService(3);

mixer.setVolume('music', 0.5);
const beforeDuck = mixer.effective('music');
mixer.duckMusic(0.2);
const ducked = mixer.effective('music');
mixer.restoreDuck();

const transition = music.play('combat', 1000);
const progress = [music.tick(500), music.tick(600)];

const hit = { id: 'cannon-hit', bus: 'sfx' as const, cooldownMs: 200, weight: 3 };
const first = sfx.trigger(hit, 0);
const cooldown = sfx.trigger(hit, 100);
const next = sfx.trigger(hit, 300);
const budget = [0, 1, 2, 3].map((button) => sfx.trigger({ id: `s${button}`, bus: 'sfx', cooldownMs: 0, weight: 3 }, 1000));

process.stdout.write(`→ music: ${beforeDuck} → ${ducked}\n`);
process.stdout.write(`→ transition: ${String(transition.to)} progress=${progress.join(', ')}\n`);
process.stdout.write(`→ sfx: ${first.ok ? 'first' : 'fail'}, cooldown=${String(!cooldown.ok)}, next=${String(next.ok)}\n`);
process.stdout.write(`→ budget rejections: ${budget.filter((r) => !r.ok).length}\n`);

if (!(beforeDuck > ducked) || progress[1] !== 1 || cooldown.ok || !next.ok || budget.filter((r) => !r.ok).length === 0) {
  process.stderr.write('DEMO M12 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M12 OK — шины → duck → музыка → SFX с кулдауном и бюджетом\n');
