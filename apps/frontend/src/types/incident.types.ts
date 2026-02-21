export type IncidentStatus = "pending" | "processing" | "completed" | "failed";
export type RiskLevel = "low" | "medium" | "high";

export interface MitigationStep {
  order: number;
  action: string;
  command?: string;
  expectedOutcome: string;
  riskLevel: RiskLevel;
}

export interface Hypothesis {
  title: string;
  description: string;
  confidence: number;
  rank: number;
  category: string;
  supportingEvidence: string[];
  affectedServices: string[];
}

export interface MitigationPlan {
  steps: MitigationStep[];
  rollbackStrategy: string;
  estimatedResolutionTime: string;
  verificationSteps: string[];
}

export interface IncidentSummary {
  engineerSummary: string;
  executiveSummary: string;
  audioUrl?: string;
  postmortemDraft?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  createdAt: string;
  completedAt?: string;
  overallConfidence?: number;
  hypotheses?: Hypothesis[];
  mitigationPlan?: MitigationPlan;
  summary?: IncidentSummary;
  graph?: {
    riskScore: number;
    errorSpike: { startTime: string; errorCount: number; services: string[] };
    deploymentProximity: { minutesBefore: number; version: string; service: string } | null;
    resourceAnomalies: Array<{ metric: string; value: string; severity: string }>;
    communicationSignals: string[];
  };
}