import type { StageResult } from '../types.js';

/** TKT-M4-003: человеко-читаемый вывод. */
export function reportConsole(results: readonly StageResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    const icon = r.passed && r.issues.every((i) => i.severity !== 'error') ? '✅' : '❌';
    lines.push(`${icon} ${r.stage} (${r.durationMs ?? '-'} ms)`);
    for (const issue of r.issues) {
      const bar = issue.severity === 'error' ? '[ERROR]' : '[WARN ]';
      lines.push(`   ${bar} ${issue.ruleId}: ${issue.message}${issue.path ? ` @ ${issue.path}` : ''}`);
    }
  }
  return lines.join('\n');
}
