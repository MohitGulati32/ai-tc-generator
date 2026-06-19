import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function EvalDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/logs`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load eval logs");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading dashboard...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (logs.length === 0) return <p className="text-gray-400 text-sm">No eval data yet. Run a generation to populate the dashboard.</p>;

  // Summary metrics
  const totalRuns = logs.length;
  const avgScore = Math.round(logs.reduce((sum, l) => sum + l.overallScore, 0) / totalRuns);
  const revisionRate = Math.round((logs.filter(l => l.revisionsUsed > 0).length / totalRuns) * 100);
  const flagRate = Math.round((logs.filter(l => l.hallucinationFlags.length > 0).length / totalRuns) * 100);
  const avgTokens = Math.round(logs.reduce((sum, l) => sum + l.totalTokens, 0) / totalRuns);

  // Dimension averages for bar chart
  const dimensions = ["coverage", "specificity", "api_completeness", "edge_case_depth", "hallucination_risk"];
  const dimensionData = dimensions.map((key) => ({
    name: key.replace(/_/g, " "),
    score: Math.round(logs.reduce((sum, l) => sum + (l.dimensionScores[key] || 0), 0) / totalRuns),
  }));

  // Quality trend for line chart
  const trendData = logs.map((l, i) => ({
    run: `Run ${i + 1}`,
    score: l.overallScore,
  }));

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Eval Dashboard</h2>
        <p className="text-sm text-gray-400">{totalRuns} run{totalRuns !== 1 ? "s" : ""} logged</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Avg Quality Score", value: `${avgScore}/100` },
          { label: "Revision Rate", value: `${revisionRate}%` },
          { label: "Hallucination Flag Rate", value: `${flagRate}%` },
          { label: "Avg Tokens / Run", value: avgTokens.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Dimension scores bar chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Avg Dimension Scores</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dimensionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quality trend line chart */}
      {logs.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quality Score Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="run" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent runs table */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Runs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="pb-2 font-medium">Story</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Recommendation</th>
                <th className="pb-2 font-medium">Revisions</th>
                <th className="pb-2 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().slice(0, 5).map((log, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">{log.userStory}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{log.overallScore}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.recommendation === "approve"
                        ? "bg-green-100 text-green-700"
                        : log.recommendation === "revise"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {log.recommendation}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{log.revisionsUsed}</td>
                  <td className="py-2 text-gray-600">{log.totalTokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
