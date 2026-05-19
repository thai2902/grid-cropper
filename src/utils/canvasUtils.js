const getAccumulatedPositions = (config, totalSize, gapSize) => {
    const count = config.length;
    if (count === 0) return [];

    // Total gap space
    const totalGap = gapSize * (count - 1);
    const availableForCells = totalSize - totalGap;

    // Safety check
    if (availableForCells <= 0) {
        return config.map(() => ({ start: 0, size: 0 }));
    }

    const totalWeight = config.reduce((a, b) => a + b, 0);
    let currentPos = 0;

    return config.map((weight, index) => {
        const size = (weight / totalWeight) * availableForCells;
        const start = currentPos;
        // Move pos for next item: current size + gap (if not last)
        currentPos += size + (index < count - 1 ? gapSize : 0);
        return { start, size };
    });
};

// margins: { top, right, bottom, left } (0-1)
// gaps: { row, col } (0-1, relative to effective dimension)
export const drawGrid = (ctx, width, height, rowConfig, colConfig, padding = 0, margins = { top: 0, right: 0, bottom: 0, left: 0 }, gaps = { row: 0, col: 0 }) => {
    if (!ctx) return;

    // Calculate effective area from margins
    const marginTop = height * margins.top;
    const marginBottom = height * margins.bottom;
    const marginLeft = width * margins.left;
    const marginRight = width * margins.right;

    const effectiveWidth = width - marginLeft - marginRight;
    const effectiveHeight = height - marginTop - marginBottom;

    if (effectiveWidth <= 0 || effectiveHeight <= 0) return;

    // Calculate gap sizes in pixels
    // Gap percentage is relative to the EFFECTIVE dimension for consistency
    const rowGapPx = effectiveHeight * gaps.row;
    const colGapPx = effectiveWidth * gaps.col;

    // Calculate positions
    const rows = getAccumulatedPositions(rowConfig, effectiveHeight, rowGapPx);
    const cols = getAccumulatedPositions(colConfig, effectiveWidth, colGapPx);

    ctx.save();
    ctx.translate(marginLeft, marginTop);

    // Draw Margin Boundary (Cyan - Helper)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, effectiveWidth, effectiveHeight);

    // Draw Cells
    rows.forEach(r => {
        cols.forEach(c => {
            // Draw Cell Boundary (Faint Red Box)
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c.start, r.start, c.size, r.size);

            // Draw Cut Circle
            const centerX = c.start + c.size / 2;
            const centerY = r.start + r.size / 2;

            const rawRadius = Math.min(c.size, r.size) / 2;
            const paddedRadius = rawRadius * (1 - padding);

            ctx.beginPath();
            ctx.arc(centerX, centerY, paddedRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ef4444'; // Bright Red
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    });

    ctx.restore();
};

export const sliceImage = async (imageSrc, rowConfig, colConfig, padding = 0, margins = { top: 0, right: 0, bottom: 0, left: 0 }, gaps = { row: 0, col: 0 }) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const width = img.width;
            const height = img.height;

            const marginTop = height * margins.top;
            const marginBottom = height * margins.bottom;
            const marginLeft = width * margins.left;
            const marginRight = width * margins.right;

            const effectiveWidth = width - marginLeft - marginRight;
            const effectiveHeight = height - marginTop - marginBottom;

            if (effectiveWidth <= 0 || effectiveHeight <= 0) {
                resolve([]);
                return;
            }

            const rowGapPx = effectiveHeight * gaps.row;
            const colGapPx = effectiveWidth * gaps.col;

            const rows = getAccumulatedPositions(rowConfig, effectiveHeight, rowGapPx);
            const cols = getAccumulatedPositions(colConfig, effectiveWidth, colGapPx);
            const slices = [];

            rows.forEach((r, rIndex) => {
                cols.forEach((c, cIndex) => {
                    const canvas = document.createElement('canvas');
                    // Canvas size matches the CELL size
                    canvas.width = c.size;
                    canvas.height = r.size;
                    const ctx = canvas.getContext('2d');

                    // 1. Clip Circle
                    const centerX = c.size / 2;
                    const centerY = r.size / 2;
                    const rawRadius = Math.min(c.size, r.size) / 2;
                    const paddedRadius = rawRadius * (1 - padding);

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, paddedRadius, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();

                    // 2. Draw Image
                    // Source X = marginLeft + c.start
                    ctx.drawImage(
                        img,
                        marginLeft + c.start, marginTop + r.start, c.size, r.size,
                        0, 0, c.size, r.size
                    );

                    slices.push({
                        id: `${rIndex}-${cIndex}`,
                        dataUrl: canvas.toDataURL('image/png'),
                        row: rIndex,
                        col: cIndex
                    });
                });
            });
            resolve(slices);
        };
        img.src = imageSrc;
    });
};
