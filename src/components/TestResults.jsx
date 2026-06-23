import { useState } from 'react';

const TABS = [
  { key: 'happy_path', label: 'Happy Path' },
  { key: 'edge_cases', label: 'Edge Cases' },
  { key: 'negative_scenarios', label: 'Negative' },
  { key: 'api_tests', label: 'API Tests' }
];

export default function TestResults({ results }) {
  const [activeTab, setActiveTab] = useState('happy_path');

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex overflow-x-auto border-b scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {results[tab.key]?.length || 0}
            </span>
          </button>
        ))}
      </div>
      <div className="p-4 space-y-4">
        {results[activeTab]?.map(test => (
          <div key={test.id} className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-start mb-2 gap-2">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{test.title}</h3>
              <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium
                ${test.priority === 'P1' ? 'bg-red-100 text-red-700' :
                  test.priority === 'P2' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'}`}>
                {test.priority}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{test.preconditions}</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              {test.steps?.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <p className="text-sm text-green-700 mt-2">
              Expected: {test.expected_result}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
