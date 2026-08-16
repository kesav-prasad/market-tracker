import React, { useEffect, useState, useRef } from 'react';
import { Plus, X, Search, Activity, Archive, Star } from 'lucide-react';
import { format } from 'date-fns';

export function InstrumentsPage() {
  const [instruments, setInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'FAVOURITES'>('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleDelete = async (ids: number[]) => {
    if (!confirm('Are you sure you want to delete ' + ids.length + ' instrument(s)?')) return;
    try {
      const res = await fetch('http://localhost:3001/api/instruments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIds([]);
        setIsEditModalOpen(false);
        fetchInstruments();
        showToast('Deleted successfully');
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2000);
  };

  const toggleFavourite = async (e: React.MouseEvent, symbol: string, currentFav: boolean) => {
    e.stopPropagation();
    const newValue = !currentFav;
    
    // Optimistic update
    setInstruments(prev => prev.map(i => i.symbol === symbol ? { ...i, isFavourite: newValue } : i));
    
    try {
      await fetch(`http://localhost:3001/api/instruments/${symbol}/favourite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavourite: newValue })
      });
      showToast(newValue ? `Added to Favourites` : `Removed from Favourites`);
    } catch (err) {
      console.error('Failed to toggle favourite', err);
      // revert
      setInstruments(prev => prev.map(i => i.symbol === symbol ? { ...i, isFavourite: currentFav } : i));
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    category: 'INDEX',
    exchange: 'NSE',
    isActive: true,
    currency: 'INR',
    displayPrecision: 2,
    provider: 'Yahoo Finance',
    providerSymbol: '',
    marketCalendarId: 1
  });

  const [yahooSearchQuery, setYahooSearchQuery] = useState('');
  const [yahooSearchResults, setYahooSearchResults] = useState<any[]>([]);
  const [isSearchingYahoo, setIsSearchingYahoo] = useState(false);
  const [showYahooDropdown, setShowYahooDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInstruments = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/instruments');
      const json = await res.json();
      if (json.success) {
        setInstruments(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError('Failed to fetch instruments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
    const interval = setInterval(() => {
      fetchInstruments();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!yahooSearchQuery) {
      setYahooSearchResults([]);
      setShowYahooDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingYahoo(true);
      try {
        const res = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(yahooSearchQuery)}`);
        const json = await res.json();
        if (json.success) {
          setYahooSearchResults(json.data);
          setShowYahooDropdown(true);
        }
      } catch (err) {
        console.error('Yahoo search error', err);
      } finally {
        setIsSearchingYahoo(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [yahooSearchQuery]);

  const handleYahooSearchSelect = (result: any) => {
    let internalSymbol = result.symbol;
    let exchange = 'NSE';
    
    if (result.symbol.endsWith('.NS')) {
      internalSymbol = result.symbol.replace('.NS', '');
      exchange = 'NSE';
    } else if (result.symbol.endsWith('.BO')) {
      internalSymbol = result.symbol.replace('.BO', '');
      exchange = 'BSE';
    } else {
      exchange = result.exchange === 'NSI' ? 'NSE' : (result.exchange || 'NSE');
    }

    setFormData({
      ...formData,
      symbol: internalSymbol,
      name: result.shortName || result.longName || internalSymbol,
      providerSymbol: result.symbol,
      exchange: exchange
    });

    setYahooSearchQuery('');
    setShowYahooDropdown(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        fetchInstruments();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
    try {
      const res = await fetch(`http://localhost:3001/api/instruments/${selectedInst.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) // Contains updated fields (symbol is ignored by backend if it's not updated, but we sent it anyway)
      });
      const json = await res.json();
      if (json.success) {
        setIsEditModalOpen(false);
        fetchInstruments();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const openEditModal = (inst: any) => {
    setSelectedInst(inst);
    setFormData({
      symbol: inst.symbol,
      name: inst.name,
      category: inst.category,
      exchange: inst.exchange,
      isActive: inst.isActive ?? true,
      currency: inst.currency || 'INR',
      displayPrecision: inst.displayPrecision ?? 2,
      provider: inst.provider,
      providerSymbol: inst.providerSymbol || '',
      marketCalendarId: inst.marketCalendarId
    });
    setIsEditModalOpen(true);
  };

  const deactivateInstrument = async () => {
    if (!selectedInst) return;
    try {
      const res = await fetch(`http://localhost:3001/api/instruments/${selectedInst.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isActive: false })
      });
      const json = await res.json();
      if (json.success) {
        setIsEditModalOpen(false);
        fetchInstruments();
      }
    } catch (err) {
      alert('Network error');
    }
  };

  let filtered = instruments.filter(i => 
    i.symbol.toLowerCase().includes(search.toLowerCase()) || 
    i.name.toLowerCase().includes(search.toLowerCase())
  );
  if (filterMode === 'FAVOURITES') {
    filtered = filtered.filter(i => i.isFavourite);
  }

  return (
    <main className="app-main" style={{ boxSizing: 'border-box', overflow: 'hidden' }}>
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {toast.visible && (
        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--surface-color)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          {toast.message}
        </div>
      )}
      <div className="panel-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Instruments</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Manage market data mapping and configuration</span>
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search symbol or name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-color)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)', marginRight: '8px' }}>
            <button 
              className={`tab-btn ${filterMode === 'ALL' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: filterMode === 'ALL' ? 'var(--surface-color)' : 'transparent', color: filterMode === 'ALL' ? 'var(--text-color)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: filterMode === 'ALL' ? 600 : 400 }}
              onClick={() => setFilterMode('ALL')}
            >
              All
            </button>
            <button 
              className={`tab-btn ${filterMode === 'FAVOURITES' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: filterMode === 'FAVOURITES' ? 'var(--surface-color)' : 'transparent', color: filterMode === 'FAVOURITES' ? 'var(--text-color)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: filterMode === 'FAVOURITES' ? 600 : 400 }}
              onClick={() => setFilterMode('FAVOURITES')}
            >
              Favourites
            </button>
          </div>
          <button className="btn-primary" onClick={() => {
            setFormData({
              symbol: '', name: '', category: 'INDEX', exchange: 'NSE', isActive: true, currency: 'INR', displayPrecision: 2, provider: 'Yahoo Finance', providerSymbol: '', marketCalendarId: 1
            });
            setIsAddModalOpen(true);
          }}>
            <Plus size={16} /> Add Instrument
          </button>
          {selectedIds.length > 0 && (
            <button className="btn-primary" style={{ marginLeft: '8px', backgroundColor: '#dc2626' }} onClick={() => handleDelete(selectedIds)}>
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll-container">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading instruments...</div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'red' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filtered.map(i => i.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="col-center">#</th>
                <th>STATUS</th>
                <th>CATEGORY</th>
                <th>SYMBOL</th>
                <th>EXCHANGE</th>
                <th className="col-right">CURRENT PRICE</th>
                <th className="col-right">SESSION CHG</th>
                <th className="col-right">SERIES CHG</th>
                <th className="col-center">CALENDAR</th>
                <th>LAST UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst, index) => {
                const latestMetric = inst.dailyMetrics?.[0];
                return (
                  <tr key={inst.id} onClick={() => openEditModal(inst)} style={{ cursor: 'pointer' }}>
                    <td className="col-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(inst.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, inst.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== inst.id));
                        }}
                      />
                    </td>
                    <td className="col-center">{index + 1}</td>
                    <td>
                      {inst.isActive 
                        ? <span className="badge badge-blue">ACTIVE</span>
                        : <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>INACTIVE</span>
                      }
                    </td>
                    <td>{inst.category}</td>
                    <td><strong className="font-mono">{inst.symbol}</strong></td>
                    <td>{inst.exchange}</td>
                    <td className="col-right font-mono font-bold">
                      {latestMetric?.price ? latestMetric.price.toFixed(inst.displayPrecision) : '—'}
                    </td>
                    <td className="col-right font-mono">
                      {latestMetric?.todayChange !== null && latestMetric?.todayChange !== undefined 
                        ? (latestMetric.todayChange > 0 ? '+' : '') + latestMetric.todayChange.toFixed(2) + '%'
                        : '—'
                      }
                    </td>
                    <td className="col-right font-mono">
                      {latestMetric?.seriesChange !== null && latestMetric?.seriesChange !== undefined 
                        ? (latestMetric.seriesChange > 0 ? '+' : '') + latestMetric.seriesChange.toFixed(2) + '%'
                        : '—'
                      }
                    </td>
                    <td className="col-center">
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{inst.marketCalendar?.name || 'Unknown'}</span>
                    </td>
                    <td className="text-muted">
                      {format(new Date(latestMetric?.updatedAt || inst.updatedAt), 'dd-MMM HH:mm')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{isEditModalOpen ? 'Edit Instrument Details' : 'Add New Instrument'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="btn-icon" style={{ border: 'none' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {!isEditModalOpen && (
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '4px' }}>SEARCH YAHOO FINANCE</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
                    <input 
                      type="text" 
                      className="search-input" 
                      style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '32px', borderColor: 'var(--primary-color)' }} 
                      value={yahooSearchQuery} 
                      onChange={e => setYahooSearchQuery(e.target.value)} 
                      placeholder="Type company name or ticker..." 
                    />
                  </div>
                  {isSearchingYahoo && (
                    <div style={{ position: 'absolute', right: '10px', top: '28px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Searching...</div>
                  )}
                  {showYahooDropdown && yahooSearchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {yahooSearchResults.map((res, i) => (
                        <div 
                          key={i}
                          onClick={() => handleYahooSearchSelect(res)}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < yahooSearchResults.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{res.symbol}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{res.exchange}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {res.shortName || res.longName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '16px 0 8px 0' }}></div>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>SYMBOL (INTERNAL)</label>
                <input required disabled={isEditModalOpen} type="text" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} placeholder="e.g. NIFTYBEES" />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>DISPLAY NAME</label>
                <input required type="text" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Nippon India ETF Nifty 50 BeES" />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>EXCHANGE</label>
                  <select className="toolbar-select" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.exchange} onChange={e => setFormData({...formData, exchange: e.target.value})}>
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>CATEGORY</label>
                  <input required type="text" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} placeholder="e.g. METAL, AUTO" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>CURRENCY</label>
                  <select className="toolbar-select" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>PRECISION (DECIMALS)</label>
                  <input required type="number" min="0" max="6" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.displayPrecision} onChange={e => setFormData({...formData, displayPrecision: parseInt(e.target.value)})} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                    Active Instrument
                  </label>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>PROVIDER</label>
                  <select className="toolbar-select" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})}>
                    <option value="Yahoo Finance">Yahoo Finance</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>PROVIDER SYMBOL</label>
                  <input required type="text" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.providerSymbol} onChange={e => setFormData({...formData, providerSymbol: e.target.value})} placeholder="e.g. NSE:NIFTYBEES" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>MARKET CALENDAR</label>
                <select className="toolbar-select" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.marketCalendarId} onChange={e => setFormData({...formData, marketCalendarId: parseInt(e.target.value)})}>
                  <option value={1}>NSE Equity (ID: 1)</option>
                  <option value={2}>BSE Equity (ID: 2)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                {isEditModalOpen && (
                  <>
                    <button type="button" onClick={deactivateInstrument} className="btn-primary" style={{ backgroundColor: '#dc2626', marginRight: 'auto' }}>
                      <Archive size={16} /> Deactivate
                    </button>
                    <button type="button" onClick={() => handleDelete([selectedInst.id])} className="btn-primary" style={{ backgroundColor: '#991b1b', marginRight: 'auto' }}>
                      <X size={16} /> Delete
                    </button>
                  </>
                )}
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="toolbar-btn">Cancel</button>
                <button type="submit" className="btn-primary">Save Instrument</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
