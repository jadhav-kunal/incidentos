export type IncidentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type InputType = "logs" | "metrics" | "slack" | "voice";

export interface RawInput {
  type: InputType;
  data: any;
}

export interface NormalizedContext {
  events: Array<{ timestamp: string; message: string; level: string; service: string }>;
  deployments: Array<{ timestamp: string; version: string; service: string }>;
  anomalies: Array<{ metric: string; value: string; severity: string }>;
  communications: Array<{ author: string; message: string; timestamp: string }>;
  voiceTranscript?: string;
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

export interface MitigationStep {
  order: number;
  action: string;
  command?: string;
  expectedOutcome: string;
  riskLevel: "low" | "medium" | "high";
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