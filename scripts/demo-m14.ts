/**
 * TKT-M14-005: демо M14 — детект профиля → бюджет → деградация → save budget.
 * Запуск: bun scripts/demo-m14.ts
 */
import {
  MobilePerformanceGovernor,
  budgetFor,
  detectDeviceProfile,
  tierFor,
} from '../src/domain/mobile/Performance.js';

const phone = detectDeviceProfile({ userAgent: 'Mozilla/5.0 (iPhone; Mobile)', touch: true, gpuScore: 25 });
const desktop = detectDeviceProfile({ userAgent: 'Mozilla/5.0 (X11; Linux)', gpuScore: 90 });
const governor = new MobilePerformanceGovernor(phone);

const before = governor.capture();
governor.record(20, 30);
const afterOne = governor.capture();
governor.record(80, 120);
const afterTwo = governor.capture();
const save = governor.validateSave(3 * 1024 * 1024);

process.stdout.write(`→ профили: ${phone.kind}/${tierFor(phone)}, ${desktop.kind}/${tierFor(desktop)}\n`);
process.stdout.write(`→ budget mobile: tick≤${budgetFor(phone).maxTickMs}ms, particles=${budgetFor(phone).particleBudget}\n`);
process.stdout.write(`→ деградация: ${before.tier}/${before.particleBudget} → ${afterOne.tier}/${afterOne.particleBudget} → ${afterTwo.tier}/${afterTwo.particleBudget}\n`);
process.stdout.write(`→ save 3МБ на mobile: ${save.ok ? 'ok' : save.error.code}\n`);

if (phone.kind !== 'mobile' || desktop.kind !== 'desktop' || afterTwo.particleBudget >= before.particleBudget || save.ok) {
  process.stderr.write('DEMO M14 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M14 OK — профиль → бюджет → деградация → лимит сохранения\n');
