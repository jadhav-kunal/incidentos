import type { MitigationPlan } from "../types/incident.types";

const riskColors = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-red-400 bg-red-500/10 border-red-500/20",
};

interface Props { plan: MitigationPlan }

export default function MitigationPanel({ plan }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-semibold">
          ETA: {plan.estimatedResolutionTime}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {plan.steps.map((step) => (
          <div key={step.order} className="glass rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-indigo-400">{step.order}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white">{step.action}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${riskColors[step.riskLevel]}`}>
                    {step.riskLevel}
                  </span>
                </div>
                {step.command && (
                  <code className="block text-xs bg-gray-950 text-emerald-400 px-3 py-1.5 rounded font-mono mt-1 break-all">
                    $ {step.command}
                  </code>
                )}
                <p className="text-xs text-gray-500 mt-1">→ {step.expectedOutcome}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rollback */}
      <div className="glass rounded-lg p-4 border-amber-500/20">
        <p className="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wider">Rollback Strategy</p>
        <p className="text-sm text-gray-400">{plan.rollbackStrategy}</p>
      </div>

      {/* Verification */}
      <div className="glass rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Verification Checklist</p>
        <div className="space-y-1.5">
          {plan.verificationSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-700 flex-shrink-0" />
              <span className="text-xs text-gray-400">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}