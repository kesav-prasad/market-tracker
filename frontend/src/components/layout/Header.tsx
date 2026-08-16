import { format } from 'date-fns';
import { RefreshCw, Clock, Menu, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  series: any;
  onRefresh: () => void;
  refreshStatus: 'IDLE' | 'UPDATING' | 'VALIDATING' | 'COMPLETED' | 'ERROR';
  onToggleSidebar?: () => void;
}

export function Header({ series, onRefresh, refreshStatus, onToggleSidebar }: HeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    const fetchMarketStatus = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/market-status');
        const json = await res.json();
        if (json.success) setIsMarketOpen(json.isMarketOpen);
      } catch (err) {
        console.error('Failed to fetch market status', err);
      }
    };
    fetchMarketStatus();
    const statusTimer = setInterval(fetchMarketStatus, 60000);
    return () => clearInterval(statusTimer);
  }, []);

  // Compute trading days left (mock for now, ideally comes from backend)
  const tradingDaysLeft = series?.tradingDaysLeft ?? 0; 

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-container">
          <button onClick={onToggleSidebar} className="btn-icon" style={{ border: 'none', padding: 0, marginRight: '8px' }}>
            <Menu className="logo-icon" size={28} />
          </button>
          <div className="logo-text">
            <h1>MARKET TRACKER</h1>
            <span>Professional Edition</span>
          </div>
        </div>
      </div>

      <div className="header-middle">
        <div className="datetime-status">
          <Clock size={16} className="text-gray-500" />
          <span className="current-datetime">{format(now, 'dd MMM yyyy | hh:mm:ss a')} IST</span>
          <div className="status-indicator" style={{ color: isMarketOpen ? 'var(--success-color)' : 'var(--error-color)' }}>
            <span 
              className="status-dot" 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: isMarketOpen ? 'var(--success-color)' : 'var(--error-color)' 
              }}
            ></span>
            <span className="status-text">{isMarketOpen ? 'Market Opened' : 'Market Closed'}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {series && (
          <div className="series-info">
            <span className="series-label">CURRENT SERIES</span>
            <div className="series-dates-row">
              <span className="series-dates">
                {format(new Date(series.referenceDate), 'dd MMM yyyy')} &rarr; {format(new Date(series.expectedExpiryDate), 'dd MMM yyyy')}
              </span>
              <span className="trading-days-badge">{tradingDaysLeft} TRADING DAYS</span>
            </div>
          </div>
        )}

        <button 
          className={`btn-primary ${refreshStatus === 'COMPLETED' ? 'bg-green-600 border-green-700' : ''} ${refreshStatus === 'ERROR' ? 'bg-red-600 border-red-700' : ''}`} 
          onClick={onRefresh} 
          disabled={refreshStatus !== 'IDLE' && refreshStatus !== 'COMPLETED' && refreshStatus !== 'ERROR'}
          style={refreshStatus === 'COMPLETED' ? { backgroundColor: 'var(--success-color)', borderColor: 'var(--success-color)' } : {}}
        >
          {refreshStatus === 'UPDATING' && <RefreshCw size={16} className="animate-spin" />}
          {refreshStatus === 'VALIDATING' && <RefreshCw size={16} className="animate-spin text-yellow-300" />}
          {refreshStatus === 'COMPLETED' && <CheckCircle2 size={16} />}
          {refreshStatus === 'ERROR' && <AlertCircle size={16} />}
          {refreshStatus === 'IDLE' && <RefreshCw size={16} />}
          <span>
            {refreshStatus === 'IDLE' ? 'REFRESH' : 
             refreshStatus === 'UPDATING' ? 'UPDATING...' : 
             refreshStatus === 'VALIDATING' ? 'VALIDATING...' : 
             refreshStatus === 'ERROR' ? 'FAILED' : 'COMPLETED'}
          </span>
        </button>

      </div>
    </header>
  );
}
