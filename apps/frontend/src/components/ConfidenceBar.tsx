interface Props {
  confidence: number; // 0-1
  rank: number;
}

const colors = [
  "from-emerald-500 to-emerald-400",
  "from-amber-500 to-amber-400",
  "from-gray-500 to-gray-400",
];

export default function ConfidenceBar({ confidence, rank }: Props) {
  const pct = Math.round(confidence * 100);
  const color = colors[rank - 1] || colors[2];

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-bold w-10 text-right">{pct}%</span>
    </div>
  );
}