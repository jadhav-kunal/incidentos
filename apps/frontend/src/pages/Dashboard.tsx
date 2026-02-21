import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentList } from "../hooks/useIncident";
import { incidentApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

const DEMO_DATA = {
  logs: `10:01:02 ERROR api-gateway - API 500 error
10:01:03 ERROR redis-client - Redis connection timeout
10:01:05 ERROR api-gateway - API 500 error
10:01:08 WARN  redis-client - Connection pool at 95% capacity
10:01:12 ERROR api-gateway - API 500 error upstream timeout`,

  metrics: `redis_latency: 450ms (baseline: 2ms) CRITICAL
cpu_usage: 42% normal
memory_usage: 58% normal
error_rate: 34% CRITICAL
request_rate: 1200rpm normal`,

  slack: `alice [10:01:15]: Seeing 500s in production — anyone else?
bob [10:01:45]: Redis latency seems high, checking metrics
charlie [10:02:10]: Did we change connection pool settings in v1.2.3?
alice [10:02:30]: Deployment was 5 mins ago — could be related
bob [10:03:00]: Rolling back now, will monitor`,
};

type Tab = "quick" | "custom";

export default function Dashboard() {
  const { incidents, loading } = useIncidentList();
  const [tab, setTab] = useState<Tab>("quick");
  const [title, setTitle] = useState("");
  const [logs, setLogs] = useState("");
  const [metrics, setMetrics] = useState("");
  const [slack, setSlack] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleSimulate = async () => {
    setCreating(true);
    try {
      const { id } = await incidentApi.create(
        "Production API 500 Spike — Redis Saturation"
      );
      await incidentApi.simulate(id);
      navigate(`/incidents/${id}`);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { id } = await incidentApi.create(title);

      // Add inputs
      if (logs.trim()) {
        await incidentApi.addInput(id, "logs", {
          entries: logs.trim().split("\n").map((line) => {
            const parts = line.split(" ");
            return {
              timestamp: parts[0] || "",
              level: parts[1] || "INFO",
              service: parts[2] || "unknown",
              message: parts.slice(3).join(" ") || line,
            };
          }),
        });
      }

      if (metrics.trim()) {
        const metricsObj: Record<string, any> = {};
        metrics.trim().split("\n").forEach((line) => {
          const [key, ...rest] = line.split(":");
          if (key) {
            const val = rest.join(":").trim();
            const isCritical = val.toLowerCase().includes("critical");
            const isWarn = val.toLowerCase().includes("warn");
            metricsObj[key.trim().replace(/\s+/g, "_")] = {
              raw: val,
              status: isCritical ? "critical" : isWarn ? "warning" : "normal",
            };
          }
        });
        await incidentApi.addInput(id, "metrics", metricsObj);
      }

      if (slack.trim()) {
        await incidentApi.addInput(id, "slack", {
          messages: slack.trim().split("\n").map((line) => {
            const match = line.match(/^(\w+)\s*\[(.+?)\]:\s*(.+)$/);
            return match
              ? { author: match[1], timestamp: match[2], message: match[3] }
              : { author: "unknown", timestamp: "", message: line };
          }),
        });
      }

      // Trigger real analysis (not simulate)
      await incidentApi.analyze(id);
      navigate(`/incidents/${id}`);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setCreating(false);
    }
  };

  const fillDemo = () => {
    setTitle("Production API 500 Spike — Redis Connection Pool Exhaustion");
    setLogs(DEMO_DATA.logs);
    setMetrics(DEMO_DATA.metrics);
    setSlack(DEMO_DATA.slack);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              IO
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">IncidentOS</h1>
              <p className="text-xs text-gray-500">Autonomous Incident Commander</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">AI Engine Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Incident Command Center
          </h2>
          <p className="text-gray-400 max-w-xl text-sm">
            Paste your logs, metrics, and Slack thread. IncidentOS reasons across
            all signals to deliver ranked root-cause hypotheses and mitigation
            playbooks in seconds.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("quick")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "quick"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ⚡ Quick Simulate
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "custom"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔬 Real Analysis
          </button>
        </div>

        {/* Quick Simulate Tab */}
        {tab === "quick" && (
          <div className="glass rounded-xl p-8 mb-8 border-indigo-500/30">
            <div className="max-w-lg">
              <h3 className="font-bold text-white text-lg mb-2">
                Simulate Production Outage
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Loads a prebuilt Redis saturation scenario — logs, metrics, Slack
                thread, and voice transcript — then runs the full AI reasoning
                pipeline live.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-gray-500">
                {["Log Ingestion", "Metrics Analysis", "Slack Correlation", "Voice Transcript", "Hypothesis Ranking", "Mitigation Plan"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSimulate}
                disabled={creating}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 text-sm"
              >
                {creating ? "⟳ Initializing pipeline..." : "⚡ Simulate Production Outage"}
              </button>
            </div>
          </div>
        )}

        {/* Real Analysis Tab */}
        {tab === "custom" && (
          <div className="glass rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Analyze Real Incident</h3>
              <button
                onClick={fillDemo}
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg transition-colors"
              >
                Fill with demo data
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Incident Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. API 500 spike — payment service degraded"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Logs */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Logs
                  </label>
                  <textarea
                    value={logs}
                    onChange={(e) => setLogs(e.target.value)}
                    placeholder={`10:01:02 ERROR api-gateway - 500 error\n10:01:03 ERROR redis - timeout`}
                    rows={8}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                  />
                </div>

                {/* Metrics */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Metrics
                  </label>
                  <textarea
                    value={metrics}
                    onChange={(e) => setMetrics(e.target.value)}
                    placeholder={`redis_latency: 450ms CRITICAL\nerror_rate: 34% CRITICAL\ncpu_usage: 42% normal`}
                    rows={8}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-blue-400 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                  />
                </div>

                {/* Slack */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Slack Thread
                  </label>
                  <textarea
                    value={slack}
                    onChange={(e) => setSlack(e.target.value)}
                    placeholder={`alice [10:01]: Seeing 500s\nbob [10:02]: Redis seems slow\ncharlie [10:03]: Deploy 5min ago`}
                    rows={8}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-purple-400 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCustomAnalysis}
                disabled={creating || !title.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg transition-all text-sm"
              >
                {creating ? "⟳ Running AI analysis pipeline..." : "🔬 Analyze Incident"}
              </button>
            </div>
          </div>
        )}

        {/* Incident List */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Recent Incidents
          </h3>
          {loading ? (
            <div className="text-gray-600 text-sm">Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-gray-600 text-sm">
              No incidents yet. Run a simulation or analyze a real incident above.
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="w-full glass rounded-xl p-4 text-left hover:border-indigo-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-indigo-300 transition-colors text-sm">
                        {inc.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(inc.createdAt).toLocaleString()}
                        {inc.overallConfidence && (
                          <span className="ml-3 text-emerald-400">
                            {Math.round(inc.overallConfidence * 100)}% confidence
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={inc.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}