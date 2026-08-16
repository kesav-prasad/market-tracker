import { format } from 'date-fns';
import { Upload, LineChart, CheckCircle2, ArrowLeft, Star } from 'lucide-react';
import { DetailedChart } from '../DetailedChart';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface InstrumentDetailCardProps {
  symbol: string;
  meta: any;
  seriesData: any;
  series?: any;
  onToggleFavourite?: (symbol: string, isFav: boolean) => void;
}

export function InstrumentDetailCard({ symbol, meta, seriesData, series, onToggleFavourite }: InstrumentDetailCardProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HISTORY' | 'RECONCILIATION' | 'DATA'>('HISTORY');
  const navigate = useNavigate();
  const [isFavourite, setIsFavourite] = useState<boolean>(meta?.isFavourite || false);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2000);
  };

  const toggleFavourite = async () => {
    const newValue = !isFavourite;
    setIsFavourite(newValue);
    if (onToggleFavourite) {
      onToggleFavourite(symbol, newValue);
    }
    try {
      await fetch(`http://localhost:3001/api/instruments/${symbol}/favourite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavourite: newValue })
      });
      showToast(newValue ? `Added to Favourites` : `Removed from Favourites`);
    } catch (err) {
      console.error('Failed to toggle favourite', err);
      setIsFavourite(!newValue); // revert
      if (onToggleFavourite) {
        onToggleFavourite(symbol, !newValue);
      }
    }
  };

  if (!meta) {
    return (
      <div className="panel detail-card empty-state">
        <LineChart size={48} className="icon-muted mb-4" />
        <p>Instrument data not found</p>
      </div>
    );
  }

  const isPositiveSession = meta.todayChange > 0;
  const isPositiveSeries = meta.seriesChange > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <button 
        onClick={() => navigate(-1)} 
        className="btn-action" 
        style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--text-secondary)', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <ArrowLeft size={16} /> BACK
      </button>

      <div className="panel detail-card" style={{ padding: '24px', position: 'relative' }}>
        {toast.visible && (
          <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--surface-color)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
            {toast.message}
          </div>
        )}
        <div className="detail-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <div className="detail-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star 
                size={24} 
                fill={isFavourite ? "#FACC15" : "transparent"} 
                color={isFavourite ? "#FACC15" : "#94a3b8"} 
                strokeWidth={isFavourite ? 2 : 1.5}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }} 
                onClick={toggleFavourite}
              />
              <h2 className="detail-title" style={{ margin: 0 }}>{symbol}</h2>
              <span className={`badge ${meta.category === 'INDEX' ? 'badge-blue' : 'badge-orange'}`}>
                {meta.category}
              </span>
            </div>
            <p className="detail-subtitle">{meta.name || 'Instrument Name'}</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="price-change-box text-right">
              <div className={`change-value ${isPositiveSession ? 'text-success' : 'text-danger'}`}>
                {isPositiveSession ? '+' : ''}{meta.todayChange?.toFixed(2) ?? '—'}%
              </div>
              <div className="change-label">Session Change</div>
            </div>
            <div className="price-change-box text-right">
              <div className={`change-value ${isPositiveSeries ? 'text-success' : 'text-danger'}`}>
                {isPositiveSeries ? '+' : ''}{meta.seriesChange?.toFixed(2) ?? '—'}%
              </div>
              <div className="change-label">Series Change</div>
            </div>
            <div className={`price-large ${meta.currentPrice > meta.referencePrice ? 'text-success' : ''}`}>
              ₹{meta.currentPrice?.toFixed(2) ?? '—'}
            </div>
          </div>
        </div>

        <div className="detail-meta-grid" style={{ marginBottom: '24px' }}>
          <div className="meta-item">
            <span className="meta-label">Reference Price</span>
            <span className="meta-value font-mono">₹{meta.referencePrice?.toFixed(2) ?? '—'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Reference Date</span>
            <span className="meta-value">
              {series?.referenceDate ? format(new Date(series.referenceDate), 'dd-MMM-yyyy') : '—'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Latest Market Date</span>
            <span className="meta-value">{meta.date ? format(new Date(meta.date), 'dd-MMM-yyyy') : '—'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <span className="meta-value status">
              <CheckCircle2 size={12} /> {meta.status}
            </span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 16px' }}>
          {(['OVERVIEW', 'HISTORY', 'RECONCILIATION', 'DATA'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          {activeTab === 'HISTORY' && (
            <div style={{ position: 'relative', height: '100%' }}>
              <DetailedChart 
                symbol={symbol}
                onClose={() => {}}
                instrumentMeta={meta}
                seriesData={seriesData}
                embedded={true}
              />
            </div>
          )}
          {activeTab === 'OVERVIEW' && (
            <div className="text-muted" style={{ textAlign: 'center', marginTop: '48px' }}>Overview coming soon</div>
          )}
          {activeTab === 'RECONCILIATION' && (
            <div className="text-muted" style={{ textAlign: 'center', marginTop: '48px' }}>Reconciliation coming soon</div>
          )}
          {activeTab === 'DATA' && (
            <div className="text-muted" style={{ textAlign: 'center', marginTop: '48px' }}>Raw data coming soon</div>
          )}
        </div>
      </div>
    </div>
  );
}
