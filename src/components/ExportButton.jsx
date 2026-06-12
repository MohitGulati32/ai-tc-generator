export default function ExportButton({ results }) {
  const handleExport = () => {
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-suite.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900"
      onClick={handleExport}
    >
      Export JSON
    </button>
  );
}