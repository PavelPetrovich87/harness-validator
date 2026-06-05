import { writeFileSync } from 'node:fs';
import type { DogfoodReport, DogfoodProjectResult } from './types.js';

export function generateReport(projects: DogfoodProjectResult[], reportPath: string): DogfoodReport {
  const passed = projects.filter((p) => p.status === 'PASS').length;
  const failed = projects.filter((p) => p.status === 'FAIL').length;
  const totalDuration = projects.reduce((sum, p) => sum + p.durationMs, 0);

  const report: DogfoodReport = {
    generatedAt: new Date().toISOString(),
    projects,
    summary: {
      total: projects.length,
      passed,
      failed,
      durationMs: totalDuration,
    },
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  return report;
}
