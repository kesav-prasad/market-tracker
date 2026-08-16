import { format } from 'date-fns';
import { Wifi, WifiOff, RefreshCcw, ShieldCheck, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FooterProps {
  stats?: any;
}

export function Footer({ stats }: FooterProps) {
  // Mock next sync time based on last sync for now (e.g., 1 hour later)
  const lastSync = stats?.lastSync ? new Date(stats.lastSync) : null;
  const nextSync = lastSync ? new Date(lastSync.getTime() + 15 * 60 * 1000) : null;
  
  const total = stats?.totalInstruments || 0;
  const valid = stats?.health?.pricesOk || 0;
  const integrity = total > 0 ? Math.round((valid / total) * 100) : 0;

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className={`status-chip ${isOnline ? 'success' : 'error'}`} style={!isOnline ? { backgroundColor: 'var(--danger-color)', color: '#fff' } : {}}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <div className="status-chip success-light">
          <RefreshCcw size={14} />
          <span>DATA SOURCE SYNCED</span>
        </div>
        <div className="status-chip" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} />
          <span>{valid}/{total} VALIDATED</span>
        </div>
        <div className="footer-text">
          <span>Last Sync: {lastSync ? format(lastSync, "dd MMM yyyy, hh:mm:ss a 'IST'") : '—'}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span>Next Sync: {nextSync ? format(nextSync, "hh:mm a 'IST'") : '—'}</span>
        </div>
      </div>
      
      <div className="footer-right">
        <div className="integrity-status">
          <ShieldCheck size={16} className={integrity === 100 ? "text-green-500" : "text-yellow-500"} />
          <span>Data Integrity: {integrity}%</span>
        </div>
        <button className="btn-export" onClick={() => window.open('http://localhost:3001/api/export-current', '_blank')}>
          <Download size={14} />
          <span>EXPORT ARCHIVES</span>
        </button>
      </div>
    </footer>
  );
}
