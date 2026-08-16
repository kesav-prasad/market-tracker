import { useNavigate } from 'react-router-dom';
import { MainTable } from '../dashboard/MainTable';

export function FavouritesPage({ data, loading, error, refreshing, handleRefresh, onToggleFavourite }: any) {
  const navigate = useNavigate();

  const handleSelectInstrument = (symbol: string) => {
    navigate(`/instruments/${symbol}`);
  };

  if (loading) return <div className="app-main">Loading Favourites...</div>;

  const { metrics, matrix, ytdData, series } = data || {};
  
  return (
    <main className="app-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {error && <div className="error-banner">{error}</div>}
      
      <div style={{ padding: '0 24px 24px 24px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '8px' }}>Favourites</h1>
        <p style={{ color: 'var(--text-muted)' }}>Quick access to your starred instruments.</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px 24px 24px', minHeight: 0 }}>
        <MainTable 
          metrics={metrics} 
          matrix={matrix} 
          ytdData={ytdData}
          series={series}
          onSelectInstrument={handleSelectInstrument} 
          showOnlyFavourites={true}
          onToggleFavourite={onToggleFavourite}
        />
      </div>
    </main>
  );
}
