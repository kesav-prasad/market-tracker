import React, { useState } from 'react';
import { FileText, Download, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const reports = [
    {
      id: 'daily_market',
      title: 'Daily Market Summary',
      description: 'Generates a PDF snapshot of all instrument performances for the current session.',
      icon: <FileText size={24} className="text-blue-500" />
    },
    {
      id: 'series_performance',
      title: 'Series Performance',
      description: 'Comprehensive analysis of the current series from reference date to today.',
      icon: <TrendingUp size={24} className="text-green-500" />
    },
    {
      id: 'data_quality',
      title: 'Data Quality Audit',
      description: 'Detailed report of missing data points, anomalies, and ingestion errors.',
      icon: <AlertTriangle size={24} className="text-orange-500" />
    },
    {
      id: 'reconciliation',
      title: 'Reconciliation Log',
      description: 'Export of all verified matches and discrepancies against the origin data source.',
      icon: <ShieldCheck size={24} className="text-purple-500" />
    }
  ];

  const handleGenerate = (id: string) => {
    setGenerating(id);
    setTimeout(() => {
      setGenerating(null);
      alert(`${id} report generation is currently mocked.`);
    }, 1500);
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Reports</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Generate and export system reports and data audits</span>
        </div>
      </div>
      
      <div style={{ padding: '24px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {reports.map(report => (
            <div key={report.id} className="detail-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--surface-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                  {report.icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{report.title}</h3>
                </div>
              </div>
              <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
                {report.description}
              </p>
              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleGenerate(report.id)}
                disabled={generating !== null}
              >
                {generating === report.id ? (
                  <span>GENERATING...</span>
                ) : (
                  <>
                    <Download size={16} /> GENERATE REPORT
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
