import { useState } from 'react';
import StoryInput from './components/StoryInput';
import TestResults from './components/TestResults';
import CoverageMeter from './components/CoverageMeter';
import ExportButton from './components/ExportButton';

export default function App() {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (story) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story })
      });
      const data = await response.json();
      setResults(data);
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
        {results && (
          <>
            <CoverageMeter score={results.coverage_score} />
            <div className="flex justify-end">
              <ExportButton results={results} />
            </div>
            <TestResults results={results} />
          </>
        )}
      </div>
    </div>
  );
}