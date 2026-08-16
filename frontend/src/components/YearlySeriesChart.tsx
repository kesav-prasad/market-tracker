import React, { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';

interface Observation {
  date: string;
  price: number | null;
  ytdChange?: number | null;
}

interface SeriesData {
  seriesId: number;
  referenceDate: string;
  referencePrice: number | null;
  expiryDate: string;
  observations: Observation[];
}

interface YearlyChartData {
  symbol: string;
  range: string;
  series: SeriesData[];
}

interface YearlySeriesChartProps {
  data: YearlyChartData | undefined;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export const YearlySeriesChart: React.FC<YearlySeriesChartProps> = ({
  data,
  width = 100,
  height = 24,
  strokeWidth = 1.5,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, flatData, minTime, timeRange, validDataCount, markers } = useMemo(() => {
    if (!data || !data.series || data.series.length === 0) {
      return { path: '', flatData: [], minTime: 0, timeRange: 1, validDataCount: 0, markers: [] };
    }

    const flattened = data.series.flatMap(s => 
      s.observations.map(o => ({
        ...o,
        seriesId: s.seriesId,
        referenceDate: s.referenceDate,
        referencePrice: s.referencePrice,
        expiryDate: s.expiryDate
      }))
    );

    if (flattened.length === 0) {
       return { path: '', flatData: [], minTime: 0, timeRange: 1, validDataCount: 0, markers: [] };
    }

    const validValues = flattened.map(d => d.ytdChange).filter((v): v is number => v !== null && v !== undefined);
    if (validValues.length === 0) {
       return { path: '', flatData: flattened, minTime: 0, timeRange: 1, validDataCount: 0, markers: [] };
    }

    const min = Math.min(0, ...validValues);
    const max = Math.max(0, ...validValues);
    const range = max - min === 0 ? 1 : max - min;
    const paddedMin = min - range * 0.1;
    const paddedMax = max + range * 0.1;
    const paddedRange = paddedMax - paddedMin;

    const timeValues = flattened.map(d => new Date(d.date).getTime());
    const minTimeVal = Math.min(...timeValues);
    const maxTimeVal = Math.max(...timeValues);
    const timeRangeVal = maxTimeVal - minTimeVal === 0 ? 1 : maxTimeVal - minTimeVal;

    let d = '';
    let isDrawing = false;
    let lastSeriesId: number | null = null;
    const markerXs: number[] = [];

    flattened.forEach((point) => {
      const t = new Date(point.date).getTime();
      const x = ((t - minTimeVal) / timeRangeVal) * width;

      if (point.seriesId !== lastSeriesId && lastSeriesId !== null) {
        // Draw vertical marker at series boundary
        markerXs.push(x);
        // Break the line at series boundary so it doesn't connect across months
        isDrawing = false;
      }
      lastSeriesId = point.seriesId;

      if (point.ytdChange === null || point.ytdChange === undefined) {
        // Break the line at missing data so it doesn't connect across gaps
        isDrawing = false;
        return;
      }

      const val = point.ytdChange;
      const y = height - ((val - paddedMin) / paddedRange) * height;

      if (!isDrawing) {
        d += `M ${x} ${y} `;
        isDrawing = true;
      } else {
        d += `L ${x} ${y} `;
      }
    });

    return { 
      path: d, 
      flatData: flattened, 
      minTime: minTimeVal, 
      timeRange: timeRangeVal, 
      validDataCount: validValues.length,
      markers: markerXs
    };
  }, [data, width, height]);

  if (!data || flatData.length === 0) {
    return <div className="text-xs text-gray-400 font-medium whitespace-nowrap">NO DATA</div>;
  }

  if (validDataCount === 0) {
    return <div className="text-xs text-gray-400 font-medium whitespace-nowrap">HISTORY NOT LOADED</div>;
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || flatData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hoverRatio = x / width;
    const hoverTime = minTime + hoverRatio * timeRange;

    let closestIdx = 0;
    let minDiff = Infinity;
    flatData.forEach((d, i) => {
      if (d.ytdChange === null || d.ytdChange === undefined) return;
      const t = new Date(d.date).getTime();
      const diff = Math.abs(t - hoverTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const trendColor = '#2563eb'; // blue

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg 
        ref={svgRef}
        width={width} 
        height={height} 
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {markers.map((x, i) => (
          <line 
            key={i} 
            x1={x} y1={0} x2={x} y2={height} 
            stroke="#9ca3af" 
            strokeWidth="1" 
            strokeDasharray="2 2" 
            opacity="0.5" 
          />
        ))}
        {validDataCount === 1 && path && (
          <circle
            cx={path.split(' ')[1]}
            cy={path.split(' ')[2]}
            r={strokeWidth * 1.5}
            fill={trendColor}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={trendColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {hoverIndex !== null && (
          <line
            x1={((new Date(flatData[hoverIndex].date).getTime() - minTime) / timeRange) * width}
            y1={0}
            x2={((new Date(flatData[hoverIndex].date).getTime() - minTime) / timeRange) * width}
            y2={height}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {hoverIndex !== null && flatData[hoverIndex] && (
        <div style={{
          position: 'fixed', // Use fixed to avoid clipping in overflow: hidden table cells
          zIndex: 9999,
          background: '#1e293b',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          pointerEvents: 'none',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '180px',
          transform: 'translate(-50%, -100%)',
          textAlign: 'left'
        }}
        ref={el => {
          // Dynamic positioning based on the SVG bounding rect
          if (el && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            el.style.left = `${rect.left + ( ((new Date(flatData[hoverIndex].date).getTime() - minTime) / timeRange) * width )}px`;
            el.style.top = `${rect.top - 5}px`;
          }
        }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
            {format(new Date(flatData[hoverIndex].date), 'dd-MMM-yyyy')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <span style={{ color: '#94a3b8' }}>Price:</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>
              {flatData[hoverIndex].price !== null ? flatData[hoverIndex].price?.toFixed(2) : 'MISSING'}
            </span>
            
            <span style={{ color: '#94a3b8' }}>Series Ref Price:</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>
              {flatData[hoverIndex].referencePrice !== null ? flatData[hoverIndex].referencePrice?.toFixed(2) : 'N/A'}
            </span>
            
            <span style={{ color: '#94a3b8' }}>YTD Change:</span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: (flatData[hoverIndex].ytdChange || 0) > 0 ? '#4ade80' : '#f87171' }}>
              {flatData[hoverIndex].ytdChange !== null &&
                  flatData[hoverIndex].ytdChange !== undefined ? 
                  flatData[hoverIndex].ytdChange!.toFixed(2) + '%' : 
                  '—'}
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '4px' }}>
            Series: {format(new Date(flatData[hoverIndex].referenceDate), 'dd-MMM')} → {format(new Date(flatData[hoverIndex].expiryDate), 'dd-MMM')}
          </div>
        </div>
      )}
    </div>
  );
};
