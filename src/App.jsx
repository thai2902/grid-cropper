import React, { useState, useEffect } from 'react';
import CanvasWorkspace from './components/CanvasWorkspace';
import PreviewPanel from './components/PreviewPanel';
import { sliceImage } from './utils/canvasUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {
  const [image, setImage] = useState(null);

  const [rowConfig, setRowConfig] = useState([1, 1, 1]);
  const [colConfig, setColConfig] = useState([1, 1, 1]);
  const [padding, setPadding] = useState(0);
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [gaps, setGaps] = useState({ row: 0, col: 0 });

  const [previews, setPreviews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (image) {
      const generate = async () => {
        setIsProcessing(true);
        const slices = await sliceImage(image, rowConfig, colConfig, padding, margins, gaps);
        setPreviews(slices);
        setIsProcessing(false);
      };

      const timeoutId = setTimeout(generate, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [image, rowConfig, colConfig, padding, margins, gaps]);

  const handleExport = async () => {
    if (previews.length === 0) return;

    const zip = new JSZip();
    previews.forEach((slice, index) => {
      const data = slice.dataUrl.split(',')[1];
      zip.file(`slice_${slice.row}_${slice.col}.png`, data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'slices.zip');
  };

  const updateGridSize = (type, action) => {
    if (type === 'row') {
      if (action === 'add') setRowConfig([...rowConfig, 1]);
      if (action === 'remove' && rowConfig.length > 1) setRowConfig(rowConfig.slice(0, -1));
    } else {
      if (action === 'add') setColConfig([...colConfig, 1]);
      if (action === 'remove' && colConfig.length > 1) setColConfig(colConfig.slice(0, -1));
    }
  };

  const updateMargin = (side, value) => {
    setMargins(prev => ({ ...prev, [side]: parseFloat(value) }));
  };

  const updateGap = (type, value) => {
    setGaps(prev => ({ ...prev, [type]: parseFloat(value) }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <header className="mb-8 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          Grid Cropper Pro
        </h1>
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          onClick={handleExport}
          disabled={!image}
        >
          Download All
        </button>
      </header>

      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-1/4 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Rows: {rowConfig.length}</span>
              <div className="flex gap-2">
                <button onClick={() => updateGridSize('row', 'remove')} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">-</button>
                <button onClick={() => updateGridSize('row', 'add')} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">+</button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Cols: {colConfig.length}</span>
              <div className="flex gap-2">
                <button onClick={() => updateGridSize('col', 'remove')} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">-</button>
                <button onClick={() => updateGridSize('col', 'add')} className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">+</button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Circle Padding: {Math.round(padding * 100)}%</label>
              <input type="range" min="0" max="0.45" step="0.01" value={padding} onChange={(e) => setPadding(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm font-medium text-gray-300 mb-3">Grid Gaps</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Row Gap: {Math.round(gaps.row * 100)}%</label>
                  <input type="range" min="0" max="0.10" step="0.005" value={gaps.row} onChange={(e) => updateGap('row', e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Col Gap: {Math.round(gaps.col * 100)}%</label>
                  <input type="range" min="0" max="0.10" step="0.005" value={gaps.col} onChange={(e) => updateGap('col', e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm font-medium text-gray-300 mb-2">Page Margins</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Top</label>
                  <input type="number" min="0" max="25" value={Math.round(margins.top * 100)} onChange={(e) => updateMargin('top', e.target.value / 100)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bottom</label>
                  <input type="number" min="0" max="25" value={Math.round(margins.bottom * 100)} onChange={(e) => updateMargin('bottom', e.target.value / 100)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Left</label>
                  <input type="number" min="0" max="25" value={Math.round(margins.left * 100)} onChange={(e) => updateMargin('left', e.target.value / 100)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Right</label>
                  <input type="number" min="0" max="25" value={Math.round(margins.right * 100)} onChange={(e) => updateMargin('right', e.target.value / 100)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <p className="text-gray-400 text-sm">
              {previews.length} slices generated.
              {isProcessing && <span className="ml-2 text-yellow-500">Processing...</span>}
            </p>
          </div>
        </aside>

        <section className="flex-1">
          <CanvasWorkspace
            imageSrc={image}
            rowConfig={rowConfig}
            colConfig={colConfig}
            padding={padding}
            margins={margins}
            gaps={gaps}
            onRowConfigChange={setRowConfig}
            onColConfigChange={setColConfig}
          />
          <PreviewPanel previews={previews} />
        </section>
      </main>
    </div>
  );
}

export default App;
