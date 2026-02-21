export interface ConfidenceFactors {
  temporalProximity: number;   // deployment close to error spike?
  signalCount: number;         // how many signals support this?
  severityMatch: number;       // does severity match symptoms?
  historicalFrequency: number; // has this happened before?
}

export function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    temporalProximity: 0.35,
    signalCount: 0.30,
    severityMatch: 0.20,
    historicalFrequency: 0.15,
  };

  const raw =
    factors.temporalProximity * weights.temporalProximity +
    factors.signalCount * weights.signalCount +
    factors.severityMatch * weights.severityMatch +
    factors.historicalFrequency * weights.historicalFrequency;

  // Normalize to 0-100
  return Math.min(Math.round(raw * 100), 99);
}

export function rankHypotheses<T extends { confidence: number }>(
  hypotheses: T[]
): T[] {
  return [...hypotheses].sort((a, b) => b.confidence - a.confidence);
}