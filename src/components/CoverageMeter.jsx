export default function CoverageMeter({ score }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">Coverage Score</span>
        <span className="text-sm font-medium text-blue-600">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}