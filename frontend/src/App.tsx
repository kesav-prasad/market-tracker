import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { fetchDashboardData, triggerRefresh } from './api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

import { MainTable } from './components/dashboard/MainTable';
import { DailySeriesMatrix } from './components/dashboard/DailySeriesMatrix';
import { InstrumentDetailCard } from './components/dashboard/InstrumentDetailCard';
import { InstrumentsPage } from './components/instruments/InstrumentsPage';
import { MarketCalendarPage } from './components/calendar/MarketCalendarPage';
import { SeriesHistoryPage } from './components/history/SeriesHistoryPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { ArchivesPage } from './components/reports/ArchivesPage';
import { FavouritesPage } from './components/favourites/FavouritesPage';
import { DataAuditPage } from './components/audit/DataAuditPage';
import './index.css';

function Dashboard({ data, loading, error, refreshing, handleRefresh, onToggleFavourite }: any) {
  const navigate = useNavigate();

  const handleSelectInstrument = (symbol: string) => {
    navigate(`/instruments/${symbol}`);
  };

  if (loading) return (
    <div className="app-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-muted, #888)' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Starting Market Tracker…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { metrics, matrix } = data || {};
  
  return (
    <main className="app-main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {error && <div className="error-banner">{error}</div>}
      
      {/* Main Table Area (Expanded) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, minHeight: 0 }}>
        <MainTable 
          metrics={metrics} 
          matrix={matrix} 
          ytdData={data?.ytdData}
          series={data?.series}
          onSelectInstrument={handleSelectInstrument} 
          onToggleFavourite={onToggleFavourite}
        />
      </div>
    </main>
  );
}

function InstrumentDetailRoute({ data, onToggleFavourite }: any) {
  const { symbol } = useParams();
  
  if (!data) return <div className="app-main">Loading data...</div>;
  if (!symbol) return <div className="app-main">Invalid symbol</div>;

  const meta = data.metrics?.find((m: any) => m.instrument === symbol);
  const matrixRow = data.matrix?.rows?.[symbol];
  const seriesData = matrixRow ? data.matrix?.dates?.map((d: string) => ({
    date: d,
    seriesChange: matrixRow.data[d]?.seriesChange ?? null
  })) : [];

  return (
    <main className="app-main" style={{ padding: '24px' }}>
      <InstrumentDetailCard 
        symbol={symbol} 
        meta={meta} 
        seriesData={seriesData} 
        series={data.series} 
        onToggleFavourite={onToggleFavourite}
      />
    </main>
  );
}

function AppLayout({ children, series = null, stats = null, onRefresh = () => {}, refreshStatus = 'IDLE' }: any) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`app-container ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      <Sidebar stats={stats} />
      <Header 
        series={series} 
        onRefresh={onRefresh} 
        refreshStatus={refreshStatus} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      {children}
      <Footer stats={stats} />
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshStatus, setRefreshStatus] = useState<'IDLE' | 'UPDATING' | 'VALIDATING' | 'COMPLETED' | 'ERROR'>('IDLE');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await fetchDashboardData();
      setData(res);
      setError('');
    } catch (err: any) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      triggerRefresh().then(() => loadData()).catch(e => console.error("Auto refresh failed", e));
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshStatus('UPDATING');
    try {
      const result = await triggerRefresh();
      setRefreshStatus('VALIDATING');
      await loadData();
      
      // If there were missing/errors, we could show 'COMPLETED WITH WARNINGS' 
      // but let's stick to COMPLETED for now, Header can read the stats.
      setRefreshStatus('COMPLETED');
      setTimeout(() => setRefreshStatus('IDLE'), 3000);
    } catch (err: any) {
      setError('UPDATE FAILED');
      setRefreshStatus('ERROR');
      setTimeout(() => setRefreshStatus('IDLE'), 3000);
    }
  };

  const handleToggleFavourite = (symbol: string, isFavourite: boolean) => {
    setData((prev: any) => {
      if (!prev || !prev.metrics) return prev;
      return {
        ...prev,
        metrics: prev.metrics.map((m: any) => 
          m.instrument === symbol ? { ...m, isFavourite } : m
        )
      };
    });
  };

  const layoutProps = {
    series: data?.series,
    stats: data?.stats,
    onRefresh: handleRefresh,
    refreshStatus: refreshStatus
  };

  return (
    <Routes>
      <Route path="/" element={<AppLayout {...layoutProps}><Dashboard data={data} loading={loading} error={error} refreshing={refreshStatus !== 'IDLE' && refreshStatus !== 'COMPLETED' && refreshStatus !== 'ERROR'} handleRefresh={handleRefresh} onToggleFavourite={handleToggleFavourite} /></AppLayout>} />
      <Route path="/instruments" element={<AppLayout {...layoutProps}><InstrumentsPage /></AppLayout>} />
      <Route path="/instruments/:symbol" element={<AppLayout {...layoutProps}><InstrumentDetailRoute data={data} onToggleFavourite={handleToggleFavourite} /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout {...layoutProps}><MarketCalendarPage /></AppLayout>} />
      <Route path="/history" element={<AppLayout {...layoutProps}><SeriesHistoryPage /></AppLayout>} />
      <Route path="/reports" element={<AppLayout {...layoutProps}><ReportsPage /></AppLayout>} />
      <Route path="/archives" element={<AppLayout {...layoutProps}><ArchivesPage /></AppLayout>} />
      <Route path="/audit" element={<AppLayout {...layoutProps}><DataAuditPage /></AppLayout>} />
      <Route path="/favourites" element={<AppLayout {...layoutProps}><FavouritesPage data={data} loading={loading} error={error} handleRefresh={handleRefresh} refreshing={refreshStatus !== 'IDLE' && refreshStatus !== 'COMPLETED' && refreshStatus !== 'ERROR'} onToggleFavourite={handleToggleFavourite} /></AppLayout>} />
    </Routes>
  );
}
