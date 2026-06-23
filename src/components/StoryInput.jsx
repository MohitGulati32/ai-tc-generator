import { useState } from 'react';

const EXAMPLE_STORIES = [
  {
    label: "Login",
    story: "As a user I want to log in with email and password so that I can access my account"
  },
  {
    label: "Shopping Cart",
    story: "As a user I want to add items to a shopping cart so that I can purchase multiple products in one transaction"
  },
  {
    label: "Password Reset",
    story: "As a user I want to reset my password via email so that I can regain access to my account if I forget my credentials"
  }
];

export default function StoryInput({ onGenerate, isLoading }) {
  const [story, setStory] = useState('');

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Paste your user story
      </label>
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs text-gray-400 self-center">Try an example:</span>
        {EXAMPLE_STORIES.map(({ label, story: example }) => (
          <button
            key={label}
            onClick={() => setStory(example)}
            disabled={isLoading}
            className="text-xs px-3 py-1 rounded-full border border-blue-200 
                       text-blue-600 hover:bg-blue-50 disabled:opacity-50 
                       transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
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
