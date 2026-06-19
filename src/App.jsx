import { useState } from 'react';
import StoryInput from './components/StoryInput';
import TestResults from './components/TestResults';
import CoverageMeter from './components/CoverageMeter';
import ExportButton from './components/ExportButton';
import EvalDashboard from './components/EvalDashboard';

export default function App() {
  const [tests, setTests] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [revisionsUsed, setRevisionsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (story) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story })
      });
      const data = await response.json();
      setTests(data.tests);
      setEvalResult(data.evalResult);
      setRevisionsUsed(data.revisionsUsed);
    } catch (err) {
      setError('Generation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Test Generator</h1>
          <p className="text-gray-500 mt-1">
            Paste a user story and get a full test suite instantly
          </p>
        </div>
        <StoryInput onGenerate={handleGenerate} isLoading={isLoading} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {tests && (
          <>
            <CoverageMeter score={tests.coverage_score} />
            <div className="flex justify-end">
              <ExportButton results={tests} />
            </div>
            <TestResults results={tests} />
            {evalResult && (
              <div className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Evaluation Results</h2>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Overall Quality Score:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {evalResult.overall_quality_score}/100
                  </span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    evalResult.recommendation === 'approve'
                      ? 'bg-green-100 text-green-700'
                      : evalResult.recommendation === 'revise'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {evalResult.recommendation.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(evalResult.dimension_scores).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-gray-50 rounded px-3 py-2">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-800">{value}/100</span>
                    </div>
                  ))}
                </div>
                {evalResult.missing_scenarios.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Missing Scenarios:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {evalResult.missing_scenarios.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {revisionsUsed > 0 && (
                  <p className="text-xs text-gray-400">
                    Revision passes used: {revisionsUsed}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Eval Dashboard</h2>
          <EvalDashboard />
        </div>
      </div>
    </div>
  );
}
