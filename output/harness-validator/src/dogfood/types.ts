export type DogfoodTemplate = 'react-vite' | 'nextjs' | 'nuxt' | 'python';

export interface DogfoodPhaseResult {
  name: 'artifacts' | 'content' | 'execution' | 'manifest';
  status: 'PASS' | 'FAIL';
  errors: string[];
}

export interface DogfoodProjectResult {
  template: DogfoodTemplate;
  tempDir: string;
  durationMs: number;
  phases: DogfoodPhaseResult[];
  errors: string[];
  status: 'PASS' | 'FAIL';
}

export interface DogfoodReport {
  generatedAt: string;
  projects: DogfoodProjectResult[];
  summary: { total: number; passed: number; failed: number; durationMs: number };
}
