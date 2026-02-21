import ConfidenceBar from "./ConfidenceBar";
import type { Hypothesis } from "../types/incident.types";

const categoryColors: Record<string, string> = {
  infrastructure: "bg-red-500/20 text-red-400 border-red-500/30",
  deployment: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "external-dependency": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  application: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const rankLabel = ["PRIMARY", "SECONDARY", "TERTIARY"];

interface Props {
  hypothesis: Hypothesis;
  isTop?: boolean;
}

export default function HypothesisCard({ hypothesis, isTop }: Props) {
  const catColor = categoryColors[hypothesis.category] || categoryColors.application;

  return (
    <div className={`glass rounded-xl p-5 ${isTop ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isTop ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
            #{hypothesis.rank} {rankLabel[hypothesis.rank - 1] || ""}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${catColor}`}>
            {hypothesis.category}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-white mb-1">{hypothesis.title}</h3>
      <p className="text-sm text-gray-400 mb-4">{hypothesis.description}</p>

      <ConfidenceBar confidence={hypothesis.confidence} rank={hypothesis.rank} />

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Supporting Evidence</p>
        {hypothesis.supportingEvidence.map((e, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">›</span>
            <span className="text-xs text-gray-400">{e}</span>
          </div>
        ))}
      </div>

      {hypothesis.affectedServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hypothesis.affectedServices.map((s) => (
            <span key={s} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}