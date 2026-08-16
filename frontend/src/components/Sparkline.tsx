import { useMemo, useState, useRef } from 'react';
import { isTuesday, getDaysInMonth, getDate, format } from 'date-fns';

interface Point {
  date: string;
  price?: number | null;
  [key: string]: any;
}

interface SparklineProps {
  data: Point[];
  dataKey: string;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showExpiryMarkers?: boolean;
  tooltipLabel?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  dataKey,
  width = 120,
  height = 30,
  color = '#2563eb', // blue-600
  strokeWidth = 1.5,
  showExpiryMarkers = false,
  tooltipLabel = 'Change:',
}) => {
  const padding = 2;
  const { path, markers, min, max, range } = useMemo(() => {
    if (!data || data.length === 0) return { path: '', markers: [], min: 0, max: 0, range: 1 };

    const validValues = data.map(d => d[dataKey]).filter((v): v is number => v !== null);
    if (validValues.length === 0) return { path: '', markers: [], min: 0, max: 0, range: 1 };

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    
    const range = max - min === 0 ? 1 : max - min;

    const timeValues = data.map(d => new Date(d.date).getTime());
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const timeRange = maxTime - minTime === 0 ? 1 : maxTime - minTime;

    let d = '';
    let isDrawing = false;
    const markerXs: number[] = [];

    data.forEach((point) => {
      if (point[dataKey] === null || point[dataKey] === undefined) {
        // Missing data: skip drawing a point here, but leave isDrawing=true 
        // so the next valid point connects to the previous valid point.
        return;
      }

      const val = point[dataKey] as number;
      const pointDate = new Date(point.date);
      const t = pointDate.getTime();

      const x = ((t - minTime) / timeRange) * width;
      const y = padding + (height - 2 * padding) * (1 - (val - min) / range);

      if (!isDrawing) {
        d += `M ${x} ${y} `;
        isDrawing = true;
      } else {
        d += `L ${x} ${y} `;
      }

      // Determine if this is an expiry date (Last Tuesday)
      if (showExpiryMarkers) {
        if (isTuesday(pointDate)) {
          const daysInMonth = getDaysInMonth(pointDate);
          if (getDate(pointDate) > daysInMonth - 7) {
            markerXs.push(x);
          }
        }
      }
    });

    return { path: d, markers: markerXs, min, max, range };
  }, [data, dataKey, width, height, showExpiryMarkers]);

  const trendColor = useMemo(() => {
    if (!data || !Array.isArray(data)) return color;
    const validValues = data.map(d => d && d[dataKey]).filter((v): v is number => typeof v === 'number' && v !== null);
    if (validValues.length < 2) return color;
    
    const first = validValues[0];
    const last = validValues[validValues.length - 1];
    
    // For percentage/change metrics anchored at 0, compare against 0.
    // For raw prices, compare against the first value.
    const reference = dataKey === 'price' ? first : 0;
    
    if (last > reference) return 'var(--custom-success, #16a34a)'; // green-600
    if (last < reference) return 'var(--custom-danger, #dc2626)'; // red-600
    return 'var(--custom-neutral, ' + color + ')';
  }, [data, dataKey, color]);

  if (!data || data.length === 0) {
    return <div className="text-xs text-gray-400 font-medium whitespace-nowrap">NO DATA</div>;
  }

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { minTime, timeRange } = useMemo(() => {
    const timeValues = data.map(d => new Date(d.date).getTime());
    const minTimeVal = Math.min(...timeValues);
    const maxTimeVal = Math.max(...timeValues);
    return {
      minTime: minTimeVal,
      timeRange: maxTimeVal - minTimeVal === 0 ? 1 : maxTimeVal - minTimeVal
    };
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hoverRatio = x / width;
    const hoverTime = minTime + hoverRatio * timeRange;

    let closestIdx = 0;
    let minDiff = Infinity;
    data.forEach((d, i) => {
      if (d[dataKey] === null) return;
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

  const hasValidValues = data.some(d => d[dataKey] !== null);
  if (!hasValidValues) {
    return <div className="text-xs text-gray-400 font-medium whitespace-nowrap">HISTORY NOT LOADED</div>;
  }

  const validDataCount = data.filter(d => d[dataKey] !== null && d[dataKey] !== undefined).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }}>
      <svg 
        ref={svgRef}
        width={width} 
        height={height} 
        className="overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
      {showExpiryMarkers && markers.map((x, i) => (
        <line 
          key={i} 
          x1={x} y1={0} x2={x} y2={height} 
          stroke="#9ca3af" 
          strokeWidth="1" 
          strokeDasharray="2 2" 
          opacity="0.5" 
        />
      ))}
      {dataKey !== 'price' && min <= 0 && max >= 0 && (
        <line
          x1={0}
          y1={padding + (height - 2 * padding) * (1 - (0 - min) / range)}
          x2={width}
          y2={padding + (height - 2 * padding) * (1 - (0 - min) / range)}
          stroke="var(--border-color, #334155)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.5"
        />
      )}
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
          x1={((new Date(data[hoverIndex].date).getTime() - minTime) / timeRange) * width}
          y1={0}
          x2={((new Date(data[hoverIndex].date).getTime() - minTime) / timeRange) * width}
          y2={height}
          stroke="#64748b"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      )}
    </svg>

    {hoverIndex !== null && data[hoverIndex] && (
      <div style={{
        position: 'fixed',
        zIndex: 9999,
        background: '#1e293b',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        pointerEvents: 'none',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        width: '150px',
        transform: 'translate(-50%, -100%)',
        textAlign: 'left'
      }}
      ref={el => {
        if (el && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const t = new Date(data[hoverIndex].date).getTime();
          el.style.left = `${rect.left + ( ((t - minTime) / timeRange) * width )}px`;
          el.style.top = `${rect.top - 5}px`;
        }
      }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
          {format(new Date(data[hoverIndex].date), 'dd-MMM-yyyy')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <span style={{ color: '#94a3b8' }}>Price:</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>
            {data[hoverIndex].price !== null ? data[hoverIndex].price?.toFixed(2) : 'MISSING'}
          </span>
          
          <span style={{ color: '#94a3b8' }}>{tooltipLabel}</span>
          <span style={{ textAlign: 'right', fontWeight: 600, color: (data[hoverIndex][dataKey] as number || 0) > 0 ? '#4ade80' : '#f87171' }}>
            {data[hoverIndex][dataKey] !== null ? `${(data[hoverIndex][dataKey] as number || 0) > 0 ? '+' : ''}${(data[hoverIndex][dataKey] as number)?.toFixed(2)}%` : 'N/A'}
          </span>
        </div>
      </div>
    )}
  </div>
  );
};
