import React, { useRef, useEffect, useState } from 'react';
import { drawGrid } from '../utils/canvasUtils';

const CanvasWorkspace = ({ imageSrc, rowConfig, colConfig, padding, margins, gaps, onRowConfigChange, onColConfigChange }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(null);

    useEffect(() => {
        if (!imageSrc || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            const container = containerRef.current;
            const maxWidth = container.clientWidth;
            const maxHeight = window.innerHeight * 0.7;

            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            const width = img.width * scale;
            const height = img.height * scale;

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            drawGrid(ctx, img.width, img.height, rowConfig, colConfig, padding, margins, gaps);

            setDimensions({ width, height });
        };

        img.src = imageSrc;
    }, [imageSrc, rowConfig, colConfig, padding, margins, gaps]);

    // Handle Dragging with GAPS
    const handleMouseDown = (e) => {
        if (!canvasRef.current || !imageSrc) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const canvasX = x * scaleX;
        const canvasY = y * scaleY;

        // Effective Area
        const imgWidth = canvasRef.current.width;
        const imgHeight = canvasRef.current.height;

        const marginLeft = imgWidth * margins.left;
        const marginTop = imgHeight * margins.top;

        const effectiveWidth = imgWidth * (1 - margins.left - margins.right);
        const effectiveHeight = imgHeight * (1 - margins.top - margins.bottom);

        // Gaps in pixels
        const rowGapPx = effectiveHeight * gaps.row;
        const colGapPx = effectiveWidth * gaps.col;

        const totalGapWidth = colGapPx * (colConfig.length - 1);
        const availableWidthForCells = effectiveWidth - totalGapWidth;

        const totalGapHeight = rowGapPx * (rowConfig.length - 1);
        const availableHeightForCells = effectiveHeight - totalGapHeight;

        // Coords relative to effective area
        const effectiveX = canvasX - marginLeft;
        const effectiveY = canvasY - marginTop;

        if (effectiveX >= 0 && effectiveX <= effectiveWidth) {
            let currentPos = 0;
            const totalWeightCols = colConfig.reduce((a, b) => a + b, 0);

            for (let i = 0; i < colConfig.length - 1; i++) {
                const cellSize = (colConfig[i] / totalWeightCols) * availableWidthForCells;
                // The "handle" is at the center of the gap after this cell
                // Cell Start (currentPos) + Cell Size + Gap/2
                const handlePos = currentPos + cellSize + (colGapPx / 2);

                if (Math.abs(effectiveX - handlePos) < 20 * scaleX) {
                    setIsDragging({ type: 'col', index: i });
                    return;
                }
                // Advance pos: cell size + gap
                currentPos += cellSize + colGapPx;
            }
        }

        if (effectiveY >= 0 && effectiveY <= effectiveHeight) {
            let currentPos = 0;
            const totalWeightRows = rowConfig.reduce((a, b) => a + b, 0);

            for (let i = 0; i < rowConfig.length - 1; i++) {
                const cellSize = (rowConfig[i] / totalWeightRows) * availableHeightForCells;
                const handlePos = currentPos + cellSize + (rowGapPx / 2);

                if (Math.abs(effectiveY - handlePos) < 20 * scaleY) {
                    setIsDragging({ type: 'row', index: i });
                    return;
                }
                currentPos += cellSize + rowGapPx;
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        const imgWidth = canvasRef.current.width;
        const imgHeight = canvasRef.current.height;

        const marginLeft = imgWidth * margins.left;
        const marginTop = imgHeight * margins.top;

        const effectiveWidth = imgWidth * (1 - margins.left - margins.right);
        const effectiveHeight = imgHeight * (1 - margins.top - margins.bottom);

        const rowGapPx = effectiveHeight * gaps.row;
        const colGapPx = effectiveWidth * gaps.col;

        if (isDragging.type === 'col') {
            const scaleX = canvasRef.current.width / rect.width;
            const canvasX = x * scaleX;
            const effectiveX = canvasX - marginLeft; // Current mouse pos in effective area

            const totalGapWidth = colGapPx * (colConfig.length - 1);
            const availableWidthForCells = effectiveWidth - totalGapWidth;
            const totalWeight = colConfig.reduce((a, b) => a + b, 0);

            // Calculate Position of start of cell[index]
            let posCellStart = 0;
            for (let i = 0; i < isDragging.index; i++) {
                const w = (colConfig[i] / totalWeight) * availableWidthForCells;
                posCellStart += w + colGapPx;
            }

            // effectiveX is roughly where the gap center should be.
            // We want to find new width for cell[index].
            // cell[index].end = effectiveX - gap/2
            // newWidth = (effectiveX - gap/2) - posCellStart

            const newLeftWidth = (effectiveX - (colGapPx / 2)) - posCellStart;

            // We also need to adjust cell[index+1].
            // Their combined width is fixed (in weight terms). We assume dragging affects valid neighbors.
            // Combined Width in Pixels:
            const weightLeft = colConfig[isDragging.index];
            const weightRight = colConfig[isDragging.index + 1];
            const combinedWeight = weightLeft + weightRight;
            const combinedWidthPx = (combinedWeight / totalWeight) * availableWidthForCells;

            const newRightWidth = combinedWidthPx - newLeftWidth;

            if (newLeftWidth > 10 && newRightWidth > 10) {
                const newConfigs = [...colConfig];
                // Convert pixels back to weights
                // w = (px / totalAvailablePx) * totalWeight
                newConfigs[isDragging.index] = (newLeftWidth / availableWidthForCells) * totalWeight;
                newConfigs[isDragging.index + 1] = (newRightWidth / availableWidthForCells) * totalWeight;
                onColConfigChange(newConfigs);
            }

        } else if (isDragging.type === 'row') {
            const scaleY = canvasRef.current.height / rect.height;
            const canvasY = y * scaleY;
            const effectiveY = canvasY - marginTop;

            const totalGapHeight = rowGapPx * (rowConfig.length - 1);
            const availableHeightForCells = effectiveHeight - totalGapHeight;
            const totalWeight = rowConfig.reduce((a, b) => a + b, 0);

            let posCellStart = 0;
            for (let i = 0; i < isDragging.index; i++) {
                const h = (rowConfig[i] / totalWeight) * availableHeightForCells;
                posCellStart += h + rowGapPx;
            }

            const newTopHeight = (effectiveY - (rowGapPx / 2)) - posCellStart;

            const weightTop = rowConfig[isDragging.index];
            const weightBottom = rowConfig[isDragging.index + 1];
            const combinedWeight = weightTop + weightBottom;
            const combinedHeightPx = (combinedWeight / totalWeight) * availableHeightForCells;

            const newBottomHeight = combinedHeightPx - newTopHeight;

            if (newTopHeight > 10 && newBottomHeight > 10) {
                const newConfigs = [...rowConfig];
                newConfigs[isDragging.index] = (newTopHeight / availableHeightForCells) * totalWeight;
                newConfigs[isDragging.index + 1] = (newBottomHeight / availableHeightForCells) * totalWeight;
                onRowConfigChange(newConfigs);
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(null);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={containerRef}
            className="w-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-xl p-4 select-none relative"
            style={{ minHeight: '400px' }}
        >
            {imageSrc ? (
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    style={{
                        width: dimensions.width,
                        height: dimensions.height,
                        maxWidth: '100%',
                        objectFit: 'contain',
                        cursor: isDragging ? (isDragging.type === 'col' ? 'col-resize' : 'row-resize') : 'crosshair'
                    }}
                />
            ) : (
                <div className="text-gray-500 flex flex-col items-center">
                    <p>Upload an image to start</p>
                </div>
            )}
        </div>
    );
};

export default CanvasWorkspace;
