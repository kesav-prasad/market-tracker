import React from 'react';

interface MatrixSparklineProps {
  data: (number | null)[];
  minY: number;
  maxY: number;
  width?: number;
  height?: number;
}

export const MatrixSparkline: React.FC<MatrixSparklineProps> = ({
  data,
  minY,
  maxY,
  width = 100,
  height = 28,
}) => {
  const validData = data.filter((d): d is number => d !== null && d !== undefined);
  
  if (validData.length === 0) {
    return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px' }}>NO DATA</div>;
  }

  // Fixed pixel padding so lines don't overflow the stroke width
  const range = maxY - minY;
  const padding = 2;

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return padding + (index / (data.length - 1)) * (width - 2 * padding);
  };

  const getY = (val: number) => {
    const clampedVal = Math.max(minY, Math.min(maxY, val));
    return padding + (height - 2 * padding) * (1 - (clampedVal - minY) / range);
  };

  const baselineY = getY(0);
  
  let pathD = '';
  
  // Create a continuous line skipping nulls (Option A)
  const validPoints = data.map((d, i) => ({ value: d, x: getX(i) })).filter(d => d.value !== null) as {value: number, x: number}[];
  
  validPoints.forEach((pt, idx) => {
    const y = getY(pt.value);
    if (idx === 0) {
      pathD += `M ${pt.x} ${y} `;
    } else {
      pathD += `L ${pt.x} ${y} `;
    }
  });

  return (
    <svg width={width} height={height} style={{ overflow: 'hidden' }}>
      {/* Baseline */}
      <line 
        x1={0} y1={baselineY} x2={width} y2={baselineY} 
        stroke="#999" 
        strokeWidth={1} 
        strokeDasharray="2,2" 
      />
      
      {/* Sparkline Path */}
      <path 
        d={pathD} 
        fill="none" 
        stroke="#3b82f6" 
        strokeWidth={1.5} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {validPoints.map((p, i) => {
        const y = getY(p.value);
        return (
          <circle 
            key={`pt-${i}`}
            cx={p.x} 
            cy={y} 
            r="1.5" 
            fill="#000000"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
};
