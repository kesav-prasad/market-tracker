import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Table2, Search } from 'lucide-react';
import { DailySeriesMatrix } from '../dashboard/DailySeriesMatrix';

export function SeriesHistoryPage() {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/series')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSeriesList(res.data);
        } else {
          setError(res.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectSeries = async (id: number) => {
    setSelectedSeriesId(id);
    setMatrixLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/series/${id}`);
      const json = await res.json();
      if (json.success) {
        setMatrixData(json.data.matrix);
      } else {
        alert('Failed to load matrix');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setMatrixLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading series history...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  if (selectedSeriesId && matrixData) {
    const selectedSeries = seriesList.find(s => s.id === selectedSeriesId);
    return (
      <main className="app-main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="panel main-table-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <button 
              onClick={() => setSelectedSeriesId(null)} 
              className="btn-action" 
              style={{ border: 'none', background: 'none', padding: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} /> BACK TO HISTORY
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              Series: {format(new Date(selectedSeries.referenceDate), 'dd MMM yyyy')} &rarr; {format(new Date(selectedSeries.expectedExpiryDate), 'dd MMM yyyy')}
            </h2>
            <span className={`badge mt-2 ${selectedSeries.status === 'ACTIVE' ? 'badge-blue' : ''}`}>{selectedSeries.status}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '24px' }}>
          <DailySeriesMatrix matrix={matrixData} />
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="panel main-table-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Series History</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>View past series performance and historical matrices</span>
        </div>
      </div>
      
      <div className="table-scroll-container" style={{ padding: '0 24px', flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>REFERENCE DATE</th>
              <th>EXPECTED EXPIRY</th>
              <th>ACTUAL EXPIRY</th>
              <th className="text-center">STATUS</th>
              <th className="col-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {seriesList.map(s => (
              <tr key={s.id}>
                <td className="font-mono font-semibold">{format(new Date(s.referenceDate), 'dd MMM yyyy')}</td>
                <td className="font-mono">{format(new Date(s.expectedExpiryDate), 'dd MMM yyyy')}</td>
                <td className="font-mono">{s.actualExpiryDate ? format(new Date(s.actualExpiryDate), 'dd MMM yyyy') : '—'}</td>
                <td className="text-center">
                  <span className={`badge ${s.status === 'ACTIVE' ? 'badge-blue' : ''}`}>{s.status}</span>
                </td>
                <td className="col-right">
                  <button 
                    className="btn-action" 
                    onClick={() => handleSelectSeries(s.id)}
                    disabled={matrixLoading && selectedSeriesId === s.id}
                  >
                    <Table2 size={16} /> VIEW MATRIX
                  </button>
                </td>
              </tr>
            ))}
            {seriesList.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted">No historical series found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </main>
  );
}
