import { useParams, useNavigate } from "react-router-dom";
import { useIncident } from "../hooks/useIncident";
import HypothesisCard from "../components/HypothesisCard";
import MitigationPanel from "../components/MitigationPanel";
import AudioPlayer from "../components/AudioPlayer";
import StatusBadge from "../components/StatusBadge";

export default function IncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incident, loading } = useIncident(id!);

  if (loading || !incident) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Initializing analysis pipeline...</p>
        </div>
      </div>
    );
  }

  const isProcessing = incident.status === "processing" || incident.status === "pending";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-white truncate">{incident.title}</h1>
              <StatusBadge status={incident.status} />
            </div>
            <p className="text-xs text-gray-500">
              Created {new Date(incident.createdAt).toLocaleString()}
              {incident.completedAt && ` · Resolved in ${Math.round((new Date(incident.completedAt).getTime() - new Date(incident.createdAt).getTime()) / 1000)}s`}
            </p>
          </div>
          {incident.graph && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Risk Score</span>
              <span className={`text-lg font-bold ${incident.graph.riskScore > 70 ? "text-red-400" : incident.graph.riskScore > 40 ? "text-amber-400" : "text-emerald-400"}`}>
                {incident.graph.riskScore}
              </span>
              <span className="text-xs text-gray-600">/100</span>
            </div>
          )}
        </div>
      </header>

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Reasoning Engine Active</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Ingesting signals, building context graph, generating hypotheses...
          </p>
          <div className="mt-8 flex justify-center gap-6 text-xs text-gray-600">
            <span>● Ingestion</span>
            <span>● Context Graph</span>
            <span>● Hypothesis Engine</span>
            <span>● Mitigation Planner</span>
            <span>● Summary</span>
          </div>
        </div>
      )}

      {/* Results */}
      {incident.status === "completed" && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Context Signals */}
          {incident.graph && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Error Count</p>
                <p className="text-2xl font-bold text-red-400">{incident.graph.errorSpike.errorCount}</p>
                <p className="text-xs text-gray-600">since {incident.graph.errorSpike.startTime}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Deployment</p>
                <p className="text-sm font-bold text-amber-400">{incident.graph.deploymentProximity?.version || "None"}</p>
                <p className="text-xs text-gray-600">{incident.graph.deploymentProximity ? `${incident.graph.deploymentProximity.minutesBefore}min before spike` : "No recent deploy"}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Anomalies</p>
                <p className="text-2xl font-bold text-orange-400">{incident.graph.resourceAnomalies.length}</p>
                <p className="text-xs text-gray-600">signals detected</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {Math.round((incident.overallConfidence || 0) * 100)}%
                </p>
                <p className="text-xs text-gray-600">primary hypothesis</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Hypotheses */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Root Cause Hypotheses
              </h2>
              {incident.hypotheses?.map((h, i) => (
                <HypothesisCard key={i} hypothesis={h} isTop={h.rank === 1} />
              ))}
            </div>

            {/* Right: Mitigation + Audio */}
            <div className="space-y-6">
              {/* Audio */}
              {incident.summary?.executiveSummary && (
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Executive Briefing
                  </h2>
                  <AudioPlayer
                    audioUrl={incident.summary.audioUrl || ""}
                    summary={incident.summary.executiveSummary}
                  />
                </div>
              )}

              {/* Mitigation */}
              {incident.mitigationPlan && (
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Mitigation Playbook
                  </h2>
                  <MitigationPanel plan={incident.mitigationPlan} />
                </div>
              )}

              {/* Engineer Summary */}
              {incident.summary?.engineerSummary && (
                <div className="glass rounded-xl p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Engineer Summary
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {incident.summary.engineerSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}