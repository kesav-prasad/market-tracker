import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';

interface DetailedChartProps {
  symbol: string;
  onClose: () => void;
  instrumentMeta: any;
  seriesData: any; // data from matrix
  embedded?: boolean;
}

type Range = 'SERIES' | '90D' | '1Y' | '5Y' | '10Y';

export const DetailedChart: React.FC<DetailedChartProps> = ({ symbol, onClose, instrumentMeta, seriesData, embedded = false }) => {
  const [range, setRange] = useState<Range>('90D');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (range === 'SERIES') {
      const dates = Object.keys(seriesData || {}).sort();
      const mapped = dates.map(d => ({
        date: d,
        price: seriesData[d]?.status === 'VERIFIED' || seriesData[d]?.status === 'MOCK' ? seriesData[d].seriesChange : null
      }));
      setData(mapped);
      return;
    }

    setLoading(true);
    fetch(`http://localhost:3001/api/history/${symbol}/${range.toLowerCase()}`)
      .then(r => r.json())
      .then(res => {
        if (isMounted) {
          setData(res.success ? res.data : []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [symbol, range, seriesData]);

  // Compute SVG Path and Hover logic
  const width = 800;
  const height = 300;
  
  const { path, validData } = useMemo(() => {
    const validValues = data.map(d => d.price).filter((v): v is number => v !== null);
    if (validValues.length === 0) return { path: '', validData: [] };

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const yRange = max - min === 0 ? 1 : max - min;
    const paddedMin = min - yRange * 0.1;
    const paddedMax = max + yRange * 0.1;
    const paddedRange = paddedMax - paddedMin;

    const timeValues = data.map(d => new Date(d.date).getTime());
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const timeRange = maxTime - minTime === 0 ? 1 : maxTime - minTime;

    let d = '';
    let isDrawing = false;
    const validDataWithCoords: any[] = [];

    data.forEach((point, i) => {
      if (point.price === null || point.price === undefined) {
        isDrawing = false;
        return;
      }
      const val = point.price;
      const t = new Date(point.date).getTime();
      const x = ((t - minTime) / timeRange) * width;
      const y = height - ((val - paddedMin) / paddedRange) * height;

      validDataWithCoords.push({ ...point, x, y, index: i });

      if (!isDrawing) {
        d += `M ${x} ${y} `;
        isDrawing = true;
      } else {
        d += `L ${x} ${y} `;
      }
    });

    return { path: d, validData: validDataWithCoords };
  }, [data, width, height]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (validData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Find closest point by X coordinate
    let closest = validData[0];
    let minDistance = Math.abs(x - validData[0].x);
    for (let i = 1; i < validData.length; i++) {
      const dist = Math.abs(x - validData[i].x);
      if (dist < minDistance) {
        minDistance = dist;
        closest = validData[i];
      }
    }
    setHoverIndex(closest.index);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const formatPercent = (val: number) => {
    if (val === null || isNaN(val)) return '—';
    const f = val.toFixed(2) + '%';
    return val > 0 ? '+' + f : f;
  };

  const activePoint = hoverIndex !== null ? validData.find(d => d.index === hoverIndex) : null;
  const content = (
    <>
      {!embedded && (
        <>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{symbol}</h2>
              <p className="text-sm text-gray-500 font-medium">{instrumentMeta?.category} • {instrumentMeta?.status}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-white border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Current Price</p>
              <p className="text-lg font-mono">{instrumentMeta?.currentPrice?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Reference Price</p>
              <p className="text-lg font-mono">{instrumentMeta?.referencePrice?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Session Change</p>
              <p className={`text-lg font-mono ${instrumentMeta?.todayChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(instrumentMeta?.todayChange)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Series Change</p>
              <p className={`text-lg font-mono ${instrumentMeta?.seriesChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(instrumentMeta?.seriesChange)}
              </p>
            </div>
          </div>
        </>
      )}

        {/* Info Grid */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-white border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Current Price</p>
            <p className="text-lg font-mono">{instrumentMeta?.currentPrice?.toFixed(2) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Reference Price</p>
            <p className="text-lg font-mono">{instrumentMeta?.referencePrice?.toFixed(2) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Session Change</p>
            <p className={`text-lg font-mono ${instrumentMeta?.todayChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(instrumentMeta?.todayChange)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Series Change</p>
            <p className={`text-lg font-mono ${instrumentMeta?.seriesChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(instrumentMeta?.seriesChange)}
            </p>
          </div>
        </div>

      {/* Chart Area */}
      <div className={`flex-1 bg-white ${embedded ? '' : 'p-6'}`}>
          <div className="flex space-x-2 mb-6">
            {(['SERIES', '90D', '1Y', '5Y', '10Y'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 text-sm font-semibold rounded ${range === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="relative border border-gray-100 rounded bg-gray-50 p-4" style={{ height: 350 }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">LOADING HISTORY...</div>
            ) : path ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <svg 
                  width={width} 
                  height={height} 
                  className="overflow-visible cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Y-axis rough grid lines */}
                  <line x1={0} y1={0} x2={width} y2={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <line x1={0} y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeDasharray="4 4" />
                  
                  <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  
                  {activePoint && (
                    <g>
                      <line x1={activePoint.x} y1={0} x2={activePoint.x} y2={height} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" />
                      <circle cx={activePoint.x} cy={activePoint.y} r={4} fill="#2563eb" />
                    </g>
                  )}
                </svg>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">INSUFFICIENT HISTORY</div>
            )}
          </div>
          
          {/* Hover Details Panel */}
          <div className="h-12 mt-4 flex items-center justify-center">
            {activePoint ? (
              <div className="bg-gray-800 text-white px-6 py-2 rounded-full flex space-x-6 text-sm font-mono shadow-lg">
                <span>{format(new Date(activePoint.date), 'dd MMM yyyy')}</span>
                <span className="text-gray-400">|</span>
                <span>{range === 'SERIES' ? formatPercent(activePoint.price) : `₹${activePoint.price.toFixed(2)}`}</span>
              </div>
            ) : (
              <div className="text-gray-400 text-sm font-medium">Hover over the chart to inspect values</div>
            )}
          </div>
        </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full w-full">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col overflow-hidden">
        {content}
      </div>
    </div>
  );
};
