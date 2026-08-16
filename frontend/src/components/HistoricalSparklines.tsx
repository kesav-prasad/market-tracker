import React, { useEffect, useState } from 'react';
import { Sparkline } from './Sparkline';

interface HistoricalSparklinesProps {
  symbol: string;
}

export const HistoricalSparklines: React.FC<HistoricalSparklinesProps> = ({ symbol }) => {
  const [data90d, setData90d] = useState<any[]>([]);
  const [data5y, setData5y] = useState<any[]>([]);
  const [data10y, setData10y] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [res90, res5y, res10y] = await Promise.all([
          fetch(`/api/history/${symbol}/90d`).then(r => r.json()),
          fetch(`/api/history/${symbol}/5y`).then(r => r.json()),
          fetch(`/api/history/${symbol}/10y`).then(r => r.json()),
        ]);

        if (isMounted) {
          if (!res90.success || !res5y.success || !res10y.success) {
            setError(true);
          } else {
            setData90d(res90.data || []);
            setData5y(res5y.data || []);
            setData10y(res10y.data || []);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching historical sparklines for', symbol, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [symbol]);

  if (loading) {
    return (
      <>
        <td className="px-6 py-4 whitespace-nowrap"><div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div></td>
        <td className="px-6 py-4 whitespace-nowrap"><div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div></td>
        <td className="px-6 py-4 whitespace-nowrap"><div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div></td>
      </>
    );
  }

  if (error) {
    return (
      <>
        <td className="px-6 py-4 whitespace-nowrap"><span className="text-xs text-red-500 font-semibold uppercase">Data Error</span></td>
        <td className="px-6 py-4 whitespace-nowrap"><span className="text-xs text-red-500 font-semibold uppercase">Data Error</span></td>
        <td className="px-6 py-4 whitespace-nowrap"><span className="text-xs text-red-500 font-semibold uppercase">Data Error</span></td>
      </>
    );
  }

  const hasValid90d = data90d.filter(d => d.price !== null).length > 0;
  const hasValid5y = data5y.filter(d => d.price !== null).length > 0;
  const hasValid10y = data10y.filter(d => d.price !== null).length > 0;

  return (
    <>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasValid90d ? <Sparkline data={data90d} dataKey="price" /> : <span className="text-xs text-gray-400 font-medium">HISTORY NOT LOADED</span>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasValid5y ? <Sparkline data={data5y} dataKey="price" /> : <span className="text-xs text-gray-400 font-medium">INSUFFICIENT HISTORY</span>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasValid10y ? <Sparkline data={data10y} dataKey="price" /> : <span className="text-xs text-gray-400 font-medium">INSUFFICIENT HISTORY</span>}
      </td>
    </>
  );
};
