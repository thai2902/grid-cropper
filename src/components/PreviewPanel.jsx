import React from 'react';

const PreviewPanel = ({ previews }) => {
    if (!previews || previews.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Previews</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previews.map((item) => (
                    <div key={item.id} className="relative group bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <img src={item.dataUrl} alt={`Slice ${item.id}`} className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 border-4 border-red-500 opacity-60 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs p-1 text-center">
                            Row {item.row + 1}, Col {item.col + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PreviewPanel;
