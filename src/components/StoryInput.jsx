import { useState } from 'react';

export default function StoryInput({ onGenerate, isLoading }) {
  const [story, setStory] = useState('');

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Paste your user story
      </label>
      <textarea
        className="w-full h-40 p-3 border border-gray-300 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="As a user, I want to..."
        value={story}
        onChange={(e) => setStory(e.target.value)}
      />
      <button
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md 
                   hover:bg-blue-700 disabled:opacity-50"
        onClick={() => onGenerate(story)}
        disabled={isLoading || !story.trim()}
      >
        {isLoading ? 'Generating...' : 'Generate Tests'}
      </button>
    </div>
  );
}