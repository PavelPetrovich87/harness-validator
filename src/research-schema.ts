/**
 * TypeScript types for Deep Research results.
 * Kept separate from src/types.ts to avoid circular dependencies
 * if schemas are loaded by research tooling.
 */

export interface ResearchPhaseAddition {
  name: string;
  description: string;
  criteria: string[];
}

export interface ResearchCriterionAddition {
  phase: string;
  criterionId: string;
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  recommendation?: string;
}

export interface ResearchCriterionUpdate {
  criterionId: string;
  newRule: string;
  newSeverity?: 'critical' | 'warning' | 'info';
  newRecommendation?: string;
}

export interface ResearchCriterionRemoval {
  criterionId: string;
  reason: string;
}

export interface ResearchResults {
  addPhases: ResearchPhaseAddition[];
  addCriteria: ResearchCriterionAddition[];
  updateCriteria: ResearchCriterionUpdate[];
  removeCriteria: ResearchCriterionRemoval[];
  version: string;
}
