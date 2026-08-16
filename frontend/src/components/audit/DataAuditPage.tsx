import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

export function DataAuditPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const fetchAudit = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/audit');
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError('Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const total = results.length;
  const verified = results.filter(r => r.validationStatus === 'VERIFIED').length;
  const errors = results.filter(r => r.validationStatus === 'ERROR').length;
  const missing = results.filter(r => r.validationStatus === 'MISSING').length;

  let filtered = results.filter(r => r.symbol.toLowerCase().includes(search.toLowerCase()));
  if (filter === 'ERRORS') filtered = filtered.filter(r => r.validationStatus === 'ERROR');
  if (filter === 'MISSING') filtered = filtered.filter(r => r.validationStatus === 'MISSING');

  const formatPercent = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
  };

  const formatPrice = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return val.toFixed(4);
  };

  return (
    <main className="app-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck className="text-success" /> Data Accuracy Audit
            </h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Independent verification trace of all internal calculations</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input type="text" className="search-input" placeholder="Search symbol..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="toolbar-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ERRORS">Errors Only</option>
              <option value="MISSING">Missing Only</option>
            </select>
             <button className="btn-primary" onClick={() => { setLoading(true); fetchAudit(); }}>Run Audit</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '0 24px', marginBottom: '16px' }}>
          <div className="detail-card" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL CHECKED</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{total}</div>
          </div>
          <div className="detail-card" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-color)' }}>VERIFIED</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{verified}</div>
          </div>
          <div className="detail-card" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: errors > 0 ? '#fef2f2' : 'transparent' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: errors > 0 ? 'var(--error-color)' : 'var(--text-secondary)' }}>CALCULATION ERRORS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: errors > 0 ? 'var(--error-color)' : 'inherit' }}>{errors}</div>
          </div>
          <div className="detail-card" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: missing > 0 ? '#fffbeb' : 'transparent' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: missing > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' }}>MISSING RAW DATA</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: missing > 0 ? 'var(--warning-color)' : 'inherit' }}>{missing}</div>
          </div>
        </div>


        <div className="table-scroll-container" style={{ flex: 1, padding: '0 24px' }}>
          {loading ? (
             <div className="p-4 text-center text-muted">Running full audit across all instruments...</div>
          ) : error ? (
             <div className="p-4 text-center text-error">{error}</div>
          ) : (
            <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th>SYMBOL</th>
                  <th>SOURCE</th>
                  <th className="text-right">RAW PRICE</th>
                  <th className="text-right">REFERENCE</th>
                  <th className="text-right">PREV SESSION</th>
                  <th className="text-right">SESSION %</th>
                  <th className="text-right">SERIES %</th>
                  <th className="text-right">YTD %</th>
                  <th className="text-center">STATUS</th>
                  <th>ERROR REASON</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.symbol}>
                    <td><strong>{r.symbol}</strong><br/><span style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.marketDate ? format(new Date(r.marketDate), 'dd-MMM') : 'NO DATE'}</span></td>
                    <td>{r.provider}<br/><span style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.providerSymbol}</span></td>
                    <td className="text-right font-mono" style={{ color: r.rawPrice === null ? 'var(--error-color)' : 'inherit' }}>{formatPrice(r.rawPrice)}</td>
                    <td className="text-right font-mono">{formatPrice(r.referencePrice)}</td>
                    <td className="text-right font-mono">{formatPrice(r.previousSessionPrice)}</td>
                    <td className="text-right font-mono">{formatPercent(r.sessionChange)}</td>
                    <td className="text-right font-mono">{formatPercent(r.seriesChange)}</td>
                    <td className="text-right font-mono">{formatPercent(r.ytdChange)}</td>
                    <td className="text-center">
                      {r.validationStatus === 'VERIFIED' && <span className="status-badge status-verified">VERIFIED</span>}
                      {r.validationStatus === 'UNVERIFIED' && <span className="status-badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>UNVERIFIED</span>}
                      {r.validationStatus === 'ERROR' && <span className="status-badge status-missing">ERROR</span>}
                      {r.validationStatus === 'MISSING' && <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>MISSING</span>}
                    </td>
                    <td style={{ color: 'var(--error-color)', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.errorReason || ''}>
                      {r.errorReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
