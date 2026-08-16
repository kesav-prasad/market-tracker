import React, { useState } from 'react';
import { Archive, Download, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

export function ArchivesPage() {
  // Start fresh with no archives
  const [archives] = useState<any[]>([]);

  return (
    <main className="app-main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="panel main-table-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Archives</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Immutable snapshots of completed series data</span>
          </div>
          <div className="toolbar-right">
            <button className="btn-primary" onClick={() => window.open('http://localhost:3001/api/export-current', '_blank')}>
              <Download size={16} /> EXPORT CURRENT SERIES
            </button>
          </div>
        </div>
        
        <div className="table-scroll-container" style={{ padding: '0 24px', flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ARCHIVE NAME</th>
                <th>CREATED DATE</th>
                <th>SIZE</th>
                <th>FORMAT</th>
                <th className="col-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {archives.length > 0 ? archives.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Archive size={16} className="text-gray-400" />
                      <strong className="font-mono">{a.name}</strong>
                    </div>
                  </td>
                  <td className="text-muted">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} />
                      {format(a.date, 'dd MMM yyyy')}
                    </div>
                  </td>
                  <td className="font-mono text-muted">{a.size}</td>
                  <td><span className="badge">{a.format}</span></td>
                  <td className="col-right">
                    <button className="btn-action" onClick={() => alert('Download starting...')}>
                      <Download size={16} /> DOWNLOAD
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                    <Archive size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p>No archives found.</p>
                    <p style={{ fontSize: '0.85em', opacity: 0.7 }}>When a series is finalized, its snapshot will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

