import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sparkline } from '../Sparkline';
import { MatrixSparkline } from '../MatrixSparkline';
import { YearlySeriesChart } from '../YearlySeriesChart';
import { Search, Star, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Settings, Lock, Download } from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuProps } from './ContextMenu';
import { FormattingToolbar } from './FormattingToolbar';
import type { FormatState } from './FormattingToolbar';

interface MainTableProps {
  metrics: any[];
  matrix: any;
  ytdData?: any;
  series?: any;
  onSelectInstrument: (symbol: string) => void;
  showOnlyFavourites?: boolean;
  onToggleFavourite?: (symbol: string, isFavourite: boolean) => void;
}

function FormatPercent({ value, status }: { value: number | null, status?: string }) {
  if (value === null || isNaN(value)) {
    if (status && status !== 'VERIFIED') {
      return <span className="badge badge-orange" style={{ fontSize: '0.55rem', padding: '2px 4px' }}>{status}</span>;
    }
    return <span className="val-neutral">—</span>;
  }
  const formatted = (Math.abs(value) < 0.005 ? 0 : value).toFixed(2) + '%';
  if (value > 0.005) return <span className="text-success font-semibold">+{formatted}</span>;
  if (value < -0.005) return <span className="text-danger font-semibold">{formatted}</span>;
  return <span className="val-neutral font-semibold">{formatted}</span>;
}

const getCategoryStyle = (cat: string): React.CSSProperties => {
  if (!cat) return { backgroundColor: 'transparent', color: 'inherit' };
  const c = cat.toUpperCase();
  
  // Hardcoded mockup colors
  switch(c) {
    case 'INDEX': return { backgroundColor: '#facc15', color: '#000' };
    case 'SENSEX': return { backgroundColor: '#c084fc', color: '#fff' };
    case 'BULLION': return { backgroundColor: '#f97316', color: '#fff' };
    case 'EQUITY': return { backgroundColor: '#06b6d4', color: '#fff' };
    case 'AUTO': return { backgroundColor: '#3b82f6', color: '#fff' };
    case 'PHARMA': return { backgroundColor: '#a855f7', color: '#fff' };
    case 'POWER': return { backgroundColor: '#ec4899', color: '#fff' };
    case 'DEFENCE': return { backgroundColor: '#8b5cf6', color: '#fff' };
    case 'IT': return { backgroundColor: '#0ea5e9', color: '#fff' };
    case 'GOODS': return { backgroundColor: '#14b8a6', color: '#fff' };
  }
  
  // Dynamic fallback palette
  const palette = [
    { bg: '#ef4444', fg: '#fff' }, // red
    { bg: '#eab308', fg: '#000' }, // yellow
    { bg: '#22c55e', fg: '#fff' }, // green
    { bg: '#6366f1', fg: '#fff' }, // indigo
    { bg: '#d946ef', fg: '#fff' }, // fuchsia
    { bg: '#f43f5e', fg: '#fff' }, // rose
    { bg: '#84cc16', fg: '#000' }, // lime
    { bg: '#10b981', fg: '#fff' }, // emerald
    { bg: '#8b5cf6', fg: '#fff' }, // violet
  ];
  
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
    hash = c.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const selected = palette[Math.abs(hash) % palette.length];
  return { backgroundColor: selected.bg, color: selected.fg };
};

const getAbsoluteChange = (currentPrice: number | null | undefined, percentChange: number | null | undefined) => {
  if (currentPrice == null || percentChange == null) return null;
  const prevPrice = currentPrice / (1 + (percentChange / 100));
  return currentPrice - prevPrice;
};
type SortField = 'isFavourite' | 'id' | 'category' | 'instrument' | 'name' | 'referencePrice' | 'currentPrice' | 'todayChange' | 'seriesChange' | 'lastSeriesChangePercent' | 'customChange' | 'status' | 'ytdChange';
type SortDirection = 'asc' | 'desc' | null;

export interface CellFormatOverride extends FormatState {
  key: string;
  scope: 'CELL' | 'ROW' | 'COLUMN' | 'HEADER';
  instrumentSymbol: string | null;
  columnId: string | null;
}

export function MainTable({ metrics, matrix, ytdData, series, onSelectInstrument, showOnlyFavourites = false, onToggleFavourite }: MainTableProps) {



  const [formatOverrides, setFormatOverrides] = useState<CellFormatOverride[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [redoHistory, setRedoHistory] = useState<any[]>([]);

  // Selection Engine
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{ symbol: string, colId: string } | null>(null);
  
  const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);
  const [painterSourceFormat, setPainterSourceFormat] = useState<Partial<FormatState> | null>(null);


let activeFormat: Partial<FormatState> = {};
  if (selectedCells.size > 0) {
    const firstCell = Array.from(selectedCells)[0];
    let existing;
    if (firstCell.startsWith('COLUMN:')) {
       existing = formatOverrides.find(o => o.key === `COLUMN::${firstCell.substring(7)}`);
    } else if (firstCell.startsWith('ROW:')) {
       existing = formatOverrides.find(o => o.key === `ROW:${firstCell.substring(4)}:`);
    } else if (firstCell.startsWith('HEADER:')) {
       existing = formatOverrides.find(o => o.key === `HEADER::${firstCell.substring(7)}`);
    } else if (firstCell.startsWith('CELL:')) {
       const parts = firstCell.substring(5).split(':');
       const sym = parts[0];
       const col = parts[1];
       existing = formatOverrides.find(o => o.key === `CELL:${sym}:${col}`) 
                  || formatOverrides.find(o => o.key === `ROW:${sym}:`) 
                  || formatOverrides.find(o => o.key === `COLUMN::${col}`);
    }
    if (existing) {
      activeFormat = {
        fillColor: existing.fillColor,
        textColor: existing.textColor,
        fontWeight: existing.fontWeight,
        fontStyle: existing.fontStyle,
        textAlign: existing.textAlign
      };
    }
  }

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Also ignore clicks inside ContextMenu or modals
      if (target.closest('.context-menu') || target.closest('.settings-modal')) return;
      if (!target.closest('.data-table') && !target.closest('.table-toolbar')) {
        setSelectedCells(new Set());
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastAction();
      } else if ((e.ctrlKey && e.key === 'y') || (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redoLastAction();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (selectedCells.size > 0) {
          handleToolbarFormatChange({ fontWeight: activeFormat.fontWeight === 'bold' ? 'normal' : 'bold' });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (selectedCells.size > 0) {
          handleToolbarFormatChange({ fontStyle: activeFormat.fontStyle === 'italic' ? 'normal' : 'italic' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionHistory, redoHistory, activeFormat, selectedCells]);

  
  const undoLastAction = async () => {
    if (actionHistory.length === 0) return;
    const historyCopy = [...actionHistory];
    const lastAction = historyCopy.pop()!;
    setActionHistory(historyCopy);
    setRedoHistory(prev => [...prev, lastAction]);

    if (lastAction.type === 'CATEGORY') {
       const m = metrics.find(orig => orig.instrument === lastAction.instrument);
       if (m) m.category = lastAction.previousCategory;
       await fetch(`http://localhost:3001/api/instruments/${lastAction.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ category: lastAction.previousCategory })
       });
       showToast("Undid category change");
    }
    else if (lastAction.type === 'FORMAT_OVERRIDE_GROUP') {
       const toDelete: string[] = [];
       const toUpdate: any[] = [];
       setFormatOverrides(prev => {
         let next = [...prev];
         for (const o of lastAction.overrides) {
           if (!o.previousOverride) {
             next = next.filter(x => x.key !== o.key);
             toDelete.push(o.key);
           } else {
             next = next.filter(x => x.key !== o.key);
             next.push(o.previousOverride);
             toUpdate.push(o.previousOverride);
           }
         }
         return next;
       });
       
       await Promise.all([
         ...toDelete.map(k => fetch(`http://localhost:3001/api/overrides/formats/${k}`, { method: 'DELETE' })),
         ...toUpdate.map(u => fetch('http://localhost:3001/api/overrides/formats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: u.key, scope: u.scope, instrumentSymbol: u.instrumentSymbol, columnId: u.columnId, updates: u })
         }))
       ]);
       showToast("Undid format override");
    }
  };

  const redoLastAction = async () => {
    if (redoHistory.length === 0) return;
    const historyCopy = [...redoHistory];
    const nextAction = historyCopy.pop()!;
    setRedoHistory(historyCopy);
    setActionHistory(prev => [...prev, nextAction]);

    if (nextAction.type === 'CATEGORY') {
       const m = metrics.find(orig => orig.instrument === nextAction.instrument);
       if (m) m.category = nextAction.newCategory;
       await fetch(`http://localhost:3001/api/instruments/${nextAction.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ category: nextAction.newCategory })
       });
       showToast("Redid category change");
    }
    else if (nextAction.type === 'FORMAT_OVERRIDE_GROUP') {
       const toUpdate: any[] = [];
       setFormatOverrides(prev => {
         let next = [...prev];
         for (const o of nextAction.overrides) {
           const existing = next.find(x => x.key === o.key);
           next = next.filter(x => x.key !== o.key);
           if (o.newUpdates === null) {
              // it was a clear format
           } else {
              const updated = { key: o.key, scope: o.scope, instrumentSymbol: o.instrumentSymbol, columnId: o.columnId, ...existing, ...o.newUpdates };
              next.push(updated);
              toUpdate.push(updated);
           }
         }
         return next;
       });
       
       await Promise.all([
         ...nextAction.overrides.filter((o:any) => o.newUpdates === null).map((o:any) => fetch(`http://localhost:3001/api/overrides/formats/${o.key}`, { method: 'DELETE' })),
         ...toUpdate.map(u => fetch('http://localhost:3001/api/overrides/formats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: u.key, scope: u.scope, instrumentSymbol: u.instrumentSymbol, columnId: u.columnId, updates: u })
         }))
       ]);
       showToast("Redid format override");
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/overrides/formats')
      .then(res => res.json())
      .then(json => {
        if (json.success) setFormatOverrides(json.data);
      })
      .catch(err => console.error('Failed to fetch overrides:', err));
  }, []);

  const handleSetOverride = async (updates: Partial<FormatState>, scope: 'CELL' | 'ROW' | 'COLUMN' | 'HEADER', instrumentSymbol: string | null, columnId: string | null, isUndo = false) => {
    const key = `${scope}:${instrumentSymbol || ''}:${columnId || ''}`;
    
    if (!isUndo) {
      const existing = formatOverrides.find(o => o.key === key);
      setActionHistory(prev => [...prev, { type: 'FORMAT_OVERRIDE', scope, instrumentSymbol, columnId, previousOverride: existing || null }]);
    }
    
    // Optimistic UI
    setFormatOverrides(prev => {
      const existing = prev.find(o => o.key === key);
      const filtered = prev.filter(o => o.key !== key);
      return [...filtered, { key, scope, instrumentSymbol, columnId, ...existing, ...updates }];
    });

    try {
      await fetch('http://localhost:3001/api/overrides/formats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, scope, instrumentSymbol, columnId, updates })
      });
    } catch (err) {
      console.error('Failed to save override:', err);
    }
  };

  const handleClearOverride = async (scope: 'CELL' | 'ROW' | 'COLUMN' | 'HEADER', instrumentSymbol: string | null, columnId: string | null, isUndo = false) => {
    const key = `${scope}:${instrumentSymbol || ''}:${columnId || ''}`;
    
    if (!isUndo) {
      const existing = formatOverrides.find(o => o.key === key);
      if (existing) setActionHistory(prev => [...prev, { type: 'FORMAT_OVERRIDE', scope, instrumentSymbol, columnId, previousOverride: existing }]);
    }

    setFormatOverrides(prev => prev.filter(o => o.key !== key));

    try {
      await fetch(`http://localhost:3001/api/overrides/formats/${key}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete override:', err);
    }
  };

  const handleClearAllOverrides = async () => {
    setFormatOverrides([]);
    try {
      await fetch('http://localhost:3001/api/overrides/formats/all', { method: 'DELETE' });
      showToast('Cleared all custom formats');
    } catch (err) {
      console.error('Failed to clear all overrides:', err);
    }
  };

  
  
  const handleToolbarFormatChange = async (updates: Partial<FormatState>) => {
    if (selectedCells.size === 0) return;
    
    const overrides: any[] = [];
    const patchPromises: any[] = [];
    
    setFormatOverrides(prev => {
      let next = [...prev];
      selectedCells.forEach(key => {
        let scope: 'CELL' | 'HEADER' | 'COLUMN' | 'ROW' = 'CELL';
        let instrSymbol: string | null = null;
        let cId: string | null = null;
        
        if (key.startsWith('COLUMN:')) {
           scope = 'COLUMN';
           cId = key.substring(7);
        } else if (key.startsWith('ROW:')) {
           scope = 'ROW';
           instrSymbol = key.substring(4);
        } else if (key.startsWith('HEADER:')) {
           scope = 'HEADER';
           cId = key.substring(7);
        } else if (key.startsWith('CELL:')) {
           scope = 'CELL';
           const parts = key.substring(5).split(':');
           instrSymbol = parts[0];
           cId = parts[1];
        } else {
           // fallback old format
           const [s, c] = key.split(':');
           if (s === '_HEADER_') { scope = 'HEADER'; cId = c; }
           else if (s === '_COLUMN_') { scope = 'COLUMN'; cId = c; }
           else if (c === '_ROW_') { scope = 'ROW'; instrSymbol = s; }
           else { scope = 'CELL'; instrSymbol = s; cId = c; }
        }
        
        const realKey = `${scope}:${instrSymbol || ''}:${cId || ''}`;
        const existing = prev.find(o => o.key === realKey);
        overrides.push({ scope, instrumentSymbol: instrSymbol, columnId: cId, previousOverride: existing || null, newUpdates: updates, key: realKey });
        
        next = next.filter(o => o.key !== realKey);
        next.push({ key: realKey, scope, instrumentSymbol: instrSymbol, columnId: cId, ...existing, ...updates });
        patchPromises.push({ key: realKey, scope, instrumentSymbol: instrSymbol, columnId: cId, updates });
      });
      return next;
    });

    setActionHistory(prev => [...prev, { type: 'FORMAT_OVERRIDE_GROUP', overrides }]);
    setRedoHistory([]);

    try {
      await Promise.all(patchPromises.map(p => 
        fetch('http://localhost:3001/api/overrides/formats', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        })
      ));
    } catch (err) {
      console.error('Failed to save overrides:', err);
    }
  };

  const handleToolbarClearFormat = async () => {
    if (selectedCells.size === 0) return;
    
    const overrides: any[] = [];
    const deletePromises: any[] = [];
    
    setFormatOverrides(prev => {
      let next = [...prev];
      selectedCells.forEach(key => {
        let scope: 'CELL' | 'HEADER' | 'COLUMN' | 'ROW' = 'CELL';
        let instrSymbol: string | null = null;
        let cId: string | null = null;
        
        if (key.startsWith('COLUMN:')) {
           scope = 'COLUMN';
           cId = key.substring(7);
        } else if (key.startsWith('ROW:')) {
           scope = 'ROW';
           instrSymbol = key.substring(4);
        } else if (key.startsWith('HEADER:')) {
           scope = 'HEADER';
           cId = key.substring(7);
        } else if (key.startsWith('CELL:')) {
           scope = 'CELL';
           const parts = key.substring(5).split(':');
           instrSymbol = parts[0];
           cId = parts[1];
        } else {
           // fallback old format
           const [s, c] = key.split(':');
           if (s === '_HEADER_') { scope = 'HEADER'; cId = c; }
           else if (s === '_COLUMN_') { scope = 'COLUMN'; cId = c; }
           else if (c === '_ROW_') { scope = 'ROW'; instrSymbol = s; }
           else { scope = 'CELL'; instrSymbol = s; cId = c; }
        }
        
        const realKey = `${scope}:${instrSymbol || ''}:${cId || ''}`;
        const existing = prev.find(o => o.key === realKey);
        if (existing) {
           overrides.push({ scope, instrumentSymbol: instrSymbol, columnId: cId, previousOverride: existing, newUpdates: null, key: realKey });
        }
        
        next = next.filter(o => o.key !== realKey);
        deletePromises.push(realKey);
      });
      return next;
    });

    if (overrides.length > 0) {
       setActionHistory(prev => [...prev, { type: 'FORMAT_OVERRIDE_GROUP', overrides }]);
       setRedoHistory([]);
    }

    try {
      await Promise.all(deletePromises.map(k => 
        fetch(`http://localhost:3001/api/overrides/formats/${k}`, { method: 'DELETE' })
      ));
    } catch (err) {
      console.error('Failed to delete overrides:', err);
    }
  };

  const handleDeleteInstrument = async (symbol: string) => {
    if (!confirm(`Are you sure you want to delete ${symbol}?`)) return;
    try {
      const res = await fetch('http://localhost:3001/api/instruments');
      const json = await res.json();
      const instr = json.data?.find((i: any) => i.symbol === symbol);
      if (instr) {
        await fetch('http://localhost:3001/api/instruments/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [instr.id] })
        });
        showToast(`Deleted ${symbol}`);
        window.location.reload(); 
      }
    } catch (e) {
      showToast('Error deleting instrument');
    }
  };

  const onRightClick = (e: React.MouseEvent, scope: 'CELL' | 'ROW' | 'COLUMN' | 'HEADER', instrumentSymbol: string | null, columnId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      scope,
      instrumentSymbol,
      columnId,
      onClose: () => setContextMenu(null),
      onDelete: instrumentSymbol ? () => handleDeleteInstrument(instrumentSymbol) : undefined
    });
  };

  const getContrastYIQ = (hexcolor: string) => {
    if (!hexcolor || hexcolor === 'transparent') return undefined;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
      hexcolor = hexcolor.split("").map(c => c + c).join("");
    }
    if (hexcolor.length !== 6) return undefined;
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  const getCellStyles = (symbol: string, columnId: string): React.CSSProperties => {
    let override: CellFormatOverride | undefined;
    
    if (symbol === "") {
      override = formatOverrides.find(o => o.scope === 'HEADER' && o.columnId === columnId);
    } else {
      override = formatOverrides.find(o => o.scope === 'CELL' && o.instrumentSymbol === symbol && o.columnId === columnId)
        || formatOverrides.find(o => o.scope === 'ROW' && o.instrumentSymbol === symbol)
        || formatOverrides.find(o => o.scope === 'COLUMN' && o.columnId === columnId);
    }

    const backgroundColor = override?.fillColor || undefined;
    let color = override?.textColor || undefined;
    
    if (backgroundColor && !color) {
      color = getContrastYIQ(backgroundColor);
    }

    const style: React.CSSProperties = {};
    if (backgroundColor) style.backgroundColor = backgroundColor;
    if (color) {
      style.color = color;
      (style as any)['--cell-text-color'] = color;
    }
    if (override?.fontWeight) style.fontWeight = override.fontWeight;
    if (override?.fontStyle) style.fontStyle = override.fontStyle;
    if (override?.textAlign) style.textAlign = override.textAlign as any;
    
    let isSelected = false;
    if (symbol === "") {
      isSelected = selectedCells.has(`HEADER:${columnId}`);
    } else {
      isSelected = selectedCells.has(`CELL:${symbol}:${columnId}`) ||
                   selectedCells.has(`ROW:${symbol}`) ||
                   selectedCells.has(`COLUMN:${columnId}`);
    }

    if (isSelected) {
      style.outline = '2px solid var(--primary-color)';
      style.outlineOffset = '-2px';
      style.zIndex = 10;
    }

    return style;
  };

  const [searchTerm, setSearchTerm] = useState('');

  const [filterMode, setFilterMode] = useState<'ALL'|'FAVOURITES'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');


  const [showSettings, setShowSettings] = useState(false);
  const [showSessionChange, setShowSessionChange] = useState(true);
  const [showSessionChart, setShowSessionChart] = useState(true);
  const [showSeriesChange, setShowSeriesChange] = useState(true);
  const [showSeriesTrend, setShowSeriesTrend] = useState(true);
  const [showCustomChg, setShowCustomChg] = useState(() => sessionStorage.getItem('showCustomChg') === 'true');
  const [showStatus, setShowStatus] = useState(true);
  const [showYearlyChart, setShowYearlyChart] = useState(true);
  const [showLastSeries, setShowLastSeries] = useState(true);
  const [customDate, setCustomDate] = useState<string | null>(() => sessionStorage.getItem('customDate'));
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = sessionStorage.getItem('rowsPerPage');
    return saved ? parseInt(saved, 10) : 20;
  });
  
  useEffect(() => { sessionStorage.setItem('showCustomChg', showCustomChg.toString()); }, [showCustomChg]);
  useEffect(() => { if (customDate) sessionStorage.setItem('customDate', customDate); else sessionStorage.removeItem('customDate'); }, [customDate]);
  useEffect(() => { sessionStorage.setItem('rowsPerPage', itemsPerPage.toString()); }, [itemsPerPage]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [customColors, setCustomColors] = useState(() => {
    const saved = sessionStorage.getItem('customColors');
    return saved ? JSON.parse(saved) : { positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' };
  });

  useEffect(() => { sessionStorage.setItem('customColors', JSON.stringify(customColors)); }, [customColors]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCells(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveColors = (newColors: any) => { setCustomColors(newColors); };
  const resetColors = () => { setCustomColors({ positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' }); };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') setSortDirection(null);
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field || !sortDirection) return <ArrowUpDown size={12} className="inline ml-1 opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />;
  };

  const saveCategory = async (m: any) => {
    if (!editingCategoryFor) return;
    const oldCat = m.category;
    m.category = editCategoryValue;
    setEditingCategoryFor(null);
    try {
      await fetch(`http://localhost:3001/api/instruments/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editCategoryValue })
      });
      setRedoHistory([]);
      setActionHistory(prev => [...prev, { type: 'CATEGORY', instrument: m.instrument, id: m.id, previousCategory: oldCat, newCategory: editCategoryValue }]);
    } catch (e) {
      m.category = oldCat;
    }
  };

  const toggleFavourite = (e: React.MouseEvent, symbol: string, currentStatus: boolean) => {
      e.stopPropagation();
      if (onToggleFavourite) {
          onToggleFavourite(symbol, !currentStatus);
      }
  };
  
  const [toast, setToast] = useState({ visible: false, message: '' });
  const showToast = (msg: string) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };


  let sortedMetrics = [...(metrics || [])].map(m => {
    let customChange = m.customChange;
    if (customDate && matrix?.rows?.[m.instrument]?.data?.[customDate]?.price) {
      const oldPrice = matrix.rows[m.instrument].data[customDate].price;
      if (oldPrice) customChange = ((m.currentPrice - oldPrice) / oldPrice) * 100;
    }

    let todayChange = m.todayChange;
    if (Math.abs(m.todayChange || 0) < 0.00001 && matrix?.rows?.[m.instrument]?.data) {
      const dates = matrix.dates || [];
      for (let i = dates.length - 1; i >= 0; i--) {
        const dData = matrix.rows[m.instrument].data[dates[i]];
        if (dData && dData.todayChange !== undefined && Math.abs(dData.todayChange) > 0.00001) {
          todayChange = dData.todayChange;
          break;
        }
      }
    }

    return { ...m, customChange, todayChange };
  });
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    sortedMetrics = sortedMetrics.filter(m => 
      (m.instrument && m.instrument.toLowerCase().includes(q)) || 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  }
  if (showOnlyFavourites) {
    sortedMetrics = sortedMetrics.filter(m => m.isFavourite);
  }
  sortedMetrics.sort((a, b) => {
    if (a.isFavourite && !b.isFavourite) return -1;
    if (!a.isFavourite && b.isFavourite) return 1;

    if (sortDirection && sortField) {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totalItems = sortedMetrics.length;
  const totalPages = Math.ceil(totalItems / (itemsPerPage || 1));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMetrics = sortedMetrics.slice(startIndex, startIndex + itemsPerPage);


  const activeColumns = [
    'id', 'category', 'instrument', 'referencePrice', 'currentPrice',
    ...(showSessionChange ? ['todayChange'] : []),
    ...(showSessionChart ? ['sessionChart'] : []),
    ...(showLastSeries ? ['lastSeriesChangePercent'] : []),
    ...(showSeriesChange ? ['seriesChange'] : []),
    ...(showSeriesTrend ? ['seriesTrend'] : []),
    ...(showYearlyChart ? ['ytdChange', 'yearlyChart'] : []),
    ...(showCustomChg ? ['customChange'] : []),
    ...(showStatus ? ['status'] : [])
  ];

  const handleTableMouseAction = (e: React.MouseEvent, type: 'down' | 'over') => {
    e.stopPropagation();
    const td = (e.target as HTMLElement).closest('td, th');
    if (!td) return;
    
    const symbol = td.getAttribute('data-symbol');
    const colId = td.getAttribute('data-colid');
    if (!symbol || !colId) return;

    if (e.button !== 0 && type === 'down') return;

    if (type === 'down') {
      const targetTag = (e.target as HTMLElement).tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'BUTTON') {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      setDragStartCell({ symbol, colId });

      if (symbol === '_HEADER_') {
        const newSet = new Set<string>();
        newSet.add('COLUMN:' + colId);
        setSelectedCells(newSet);
        return;
      }

      if (colId === 'id') {
        const newSet = new Set<string>();
        activeColumns.forEach(c => newSet.add('CELL:' + symbol + ':' + c));
        setSelectedCells(newSet);
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
        setSelectedCells(new Set(['CELL:' + symbol + ':' + colId]));
      } else if (e.metaKey || e.ctrlKey) {
        const newSet = new Set(selectedCells);
        newSet.add('CELL:' + symbol + ':' + colId);
        setSelectedCells(newSet);
      }
    } else if (type === 'over' && isDragging) {
      if (e.buttons !== 1) {
        setIsDragging(false);
        return;
      }
      if (!dragStartCell) return;
      if (symbol === '_HEADER_') return; 
      
      const startRowIdx = paginatedMetrics.findIndex(m => m.instrument === dragStartCell.symbol);
      const endRowIdx = paginatedMetrics.findIndex(m => m.instrument === symbol);
      const startColIdx = activeColumns.indexOf(dragStartCell.colId);
      const endColIdx = activeColumns.indexOf(colId);
      
      if (startRowIdx !== -1 && endRowIdx !== -1 && startColIdx !== -1 && endColIdx !== -1) {
        const minRow = Math.min(startRowIdx, endRowIdx);
        const maxRow = Math.max(startRowIdx, endRowIdx);
        const minCol = Math.min(startColIdx, endColIdx);
        const maxCol = Math.max(startColIdx, endColIdx);
        
        const newSelection = new Set<string>();
        if (e.metaKey || e.ctrlKey) {
          selectedCells.forEach(k => newSelection.add(k)); 
        }
        
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            newSelection.add('CELL:' + paginatedMetrics[r].instrument + ':' + activeColumns[c]);
          }
        }
        setSelectedCells(newSelection);
      }
    }
  };

  const tableMouseHandlers = {
    onMouseDown: (e: React.MouseEvent) => handleTableMouseAction(e, 'down'),
    onMouseOver: (e: React.MouseEvent) => handleTableMouseAction(e, 'over'),
    onMouseUp: () => {
      setIsDragging(false);
      if (isFormatPainterActive && painterSourceFormat) {
        handleToolbarFormatChange(painterSourceFormat);
        setIsFormatPainterActive(false);
        setPainterSourceFormat(null);
      }
    },
    onMouseLeave: () => setIsDragging(false),
  };
  const refDateStr = series?.referenceDate ? format(new Date(series.referenceDate), 'dd-MMM-yyyy') : '—';
  const refDateShort = series?.referenceDate ? format(new Date(series.referenceDate), 'dd-MMM') : '—';
  const currentDateStr = format(new Date(), 'dd-MMM-yyyy');

  if (showOnlyFavourites && totalItems === 0 && !searchTerm) {
    return (
      <div className="panel main-table-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', fontWeight: 600 }}>NO FAVOURITES YET</h2>
        <p style={{ color: 'var(--text-muted)' }}>Star an instrument to keep it here for quick access.</p>
      </div>
    );
  }



  return (
    <div className="panel" onMouseDown={() => setSelectedCells(new Set())} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
      '--custom-success': customColors.positive, 
      '--custom-danger': customColors.negative, 
      '--custom-neutral': customColors.neutral 
    } as React.CSSProperties}>
      
      {toast.visible && (
        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--surface-color)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          {toast.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="panel-header table-toolbar" onMouseDown={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <FormattingToolbar 
          onFormatChange={handleToolbarFormatChange}
          onClearFormat={handleToolbarClearFormat}
          onFormatPainter={() => {
            if (isFormatPainterActive) setIsFormatPainterActive(false);
            else {
              setIsFormatPainterActive(true);
              setPainterSourceFormat(activeFormat);
            }
          }}
          isFormatPainterActive={isFormatPainterActive}
          selectedCount={selectedCells.size}
          activeFormat={activeFormat}
        />
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search instrument or symbol..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>

        </div>
        <div className="toolbar-right">
          {showOnlyFavourites && (
            <>
              <select className="toolbar-select">
                <option>All Favourites</option>
                <option>Positive Today</option>
                <option>Negative Today</option>
                <option>Positive Series</option>
                <option>Negative Series</option>
                <option>Data Issues</option>
              </select>
            </>
          )}
          <select className="toolbar-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
            <option>All Categories</option>
            {Array.from(new Set(metrics?.map(m => m.category).filter(Boolean))).sort().map(cat => (
              <option key={String(cat)}>{String(cat)}</option>
            ))}
          </select>
          <button className="btn-action secondary" onClick={() => window.location.href = 'http://localhost:3001/api/export-current'} title="Export Dashboard to Excel">
            <Download size={18} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn-action secondary" onClick={() => setShowSettings(!showSettings)} title="Table Settings">
              <Settings size={18} />
            </button>
            {showSettings && (
              <>
              <div style={{position: 'fixed', inset: 0, zIndex: 40}} onClick={() => setShowSettings(false)}></div>
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', zIndex: 50, width: '220px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>COLUMNS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSessionChange} onChange={e => setShowSessionChange(e.target.checked)} /> SESSION CHANGE
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSessionChart} onChange={e => setShowSessionChart(e.target.checked)} /> SESSION CHART
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showLastSeries} onChange={e => setShowLastSeries(e.target.checked)} /> LAST SERIES
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSeriesChange} onChange={e => setShowSeriesChange(e.target.checked)} /> SERIES CHANGE
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSeriesTrend} onChange={e => setShowSeriesTrend(e.target.checked)} /> SERIES TREND
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showYearlyChart} onChange={e => setShowYearlyChart(e.target.checked)} /> YEARLY CHART
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showCustomChg} onChange={e => setShowCustomChg(e.target.checked)} /> CUSTOM % CHG
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showStatus} onChange={e => setShowStatus(e.target.checked)} /> STATUS
                  </label>
                  <button onClick={() => { setShowSessionChange(true); setShowSessionChart(true); setShowLastSeries(true); setShowSeriesChange(true); setShowSeriesTrend(true); setShowYearlyChart(true); setShowCustomChg(true); setShowStatus(true); }} style={{ marginTop: '4px', padding: '4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: 'pointer' }}>Show all</button>
                </div>

                
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>COLORS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', fontSize: '0.8rem', marginBottom: '12px' }}>
                  <span>Positive</span>
                  <input type="color" value={customColors.positive} onChange={e => saveColors({...customColors, positive: e.target.value})} style={{ padding: 0, width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                  
                  <span>Negative</span>
                  <input type="color" value={customColors.negative} onChange={e => saveColors({...customColors, negative: e.target.value})} style={{ padding: 0, width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                  
                  <span>Neutral</span>
                  <input type="color" value={customColors.neutral} onChange={e => saveColors({...customColors, neutral: e.target.value})} style={{ padding: 0, width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                </div>
                <button onClick={resetColors} style={{ width: '100%', padding: '4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>Reset Colors</button>
                
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginTop: '16px', marginBottom: '8px', color: 'var(--text-secondary)' }}>CUSTOM OVERRIDES</div>
                <button onClick={handleClearAllOverrides} style={{ width: '100%', padding: '4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--danger-color)', background: 'transparent', cursor: 'pointer', color: 'var(--danger-color)' }}>Clear ALL custom colors</button>
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll-container" style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table" {...tableMouseHandlers} style={{ userSelect: isDragging ? 'none' : 'auto' }}>
          <thead>
            <tr>
              <th className="col-center cursor-pointer sticky-col-1" style={getCellStyles("", "id")} data-symbol="_HEADER_" data-colid="id" onContextMenu={(e) => onRightClick(e, "HEADER", null, "id")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}># <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('id'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('id')}</button></div>
              </th>
              <th className="col-center cursor-pointer sticky-col-2" style={getCellStyles("", "category")} data-symbol="_HEADER_" data-colid="category" onContextMenu={(e) => onRightClick(e, "HEADER", null, "category")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>CATEGORY <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('category'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('category')}</button></div>
              </th>
              <th className="col-center cursor-pointer sticky-col-3" style={getCellStyles("", "instrument")} data-symbol="_HEADER_" data-colid="instrument" onContextMenu={(e) => onRightClick(e, "HEADER", null, "instrument")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>SYMBOL <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('instrument'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('instrument')}</button></div>
              </th>
              <th className="col-right cursor-pointer" title={refDateStr} style={getCellStyles("", "referencePrice")} data-symbol="_HEADER_" data-colid="referencePrice" onContextMenu={(e) => onRightClick(e, "HEADER", null, "referencePrice")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', textAlign: 'right' }}><button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('referencePrice'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('referencePrice')}</button> <span>REFERENCE<br/><span className="text-[10px] text-slate-400 font-normal">({refDateShort})</span></span></div>
              </th>
              <th className="col-right cursor-pointer" title={currentDateStr} style={getCellStyles("", "currentPrice")} data-symbol="_HEADER_" data-colid="currentPrice" onContextMenu={(e) => onRightClick(e, "HEADER", null, "currentPrice")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}> <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('currentPrice'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('currentPrice')}</button> CURRENT</div>
              </th>
              {showSessionChange && (<th className="col-right cursor-pointer" style={getCellStyles("", "todayChange")} data-symbol="_HEADER_" data-colid="todayChange" onContextMenu={(e) => onRightClick(e, "HEADER", null, "todayChange")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', textAlign: 'right' }}>
                  <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('todayChange'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('todayChange')}</button> 
                  <span>SESSION<br/>CHANGE</span>
                </div>
              </th>)}
              {showSessionChart && (<th className="col-center" title="Monthly series performance from expiry reference" style={getCellStyles("", "sessionChart")} data-symbol="_HEADER_" data-colid="sessionChart" onContextMenu={(e) => onRightClick(e, "HEADER", null, "sessionChart")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <span>SESSION<br/>CHART</span>
                </div>
              </th>)}
              {showLastSeries && (<th className="col-right cursor-pointer" title={`vs ${refDateShort}`} style={getCellStyles("", "lastSeriesChangePercent")} data-symbol="_HEADER_" data-colid="lastSeriesChangePercent" onContextMenu={(e) => onRightClick(e, "HEADER", null, "lastSeriesChangePercent")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', textAlign: 'right' }}>
                  <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('lastSeriesChangePercent'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('lastSeriesChangePercent')}</button> 
                  <span>LAST SERIES<br/><span className="text-[10px] text-slate-400 font-normal">(vs {refDateShort})</span></span>
                </div>
              </th>)}
              {showSeriesChange && (<th className="col-right cursor-pointer" title={`vs ${refDateShort}`} style={getCellStyles("", "seriesChange")} data-symbol="_HEADER_" data-colid="seriesChange" onContextMenu={(e) => onRightClick(e, "HEADER", null, "seriesChange")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', textAlign: 'right' }}>
                  <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('seriesChange'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('seriesChange')}</button> 
                  <span>SERIES<br/>CHANGE</span>
                </div>
              </th>)}
              {showSeriesTrend && (<th className="col-center" title="Cumulative series performance from expiry reference" style={getCellStyles("", "seriesTrend")} data-symbol="_HEADER_" data-colid="seriesTrend" onContextMenu={(e) => onRightClick(e, "HEADER", null, "seriesTrend")}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <span>SERIES<br/>TREND</span>
                </div>
              </th>)}
              {showYearlyChart && (
                <th className="col-center cursor-pointer" title="Calendar-year performance from January reference" style={getCellStyles("", "ytdChange")} data-symbol="_HEADER_" data-colid="ytdChange" onContextMenu={(e) => onRightClick(e, "HEADER", null, "ytdChange")}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('ytdChange'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('ytdChange')}</button><span>from jan 1</span>
                  </div>
                </th>
              )}
              {showYearlyChart && (
                <th className="col-center cursor-pointer" title="Yearly trend chart" style={getCellStyles("", "yearlyChart")} data-symbol="_HEADER_" data-colid="yearlyChart" onContextMenu={(e) => onRightClick(e, "HEADER", null, "yearlyChart")}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <span>from jan 1 trend</span>
                  </div>
                </th>
              )}
              {showCustomChg && (<th className="col-center cursor-pointer w-min whitespace-nowrap" style={getCellStyles("", "customChange")} data-symbol="_HEADER_" data-colid="customChange" onContextMenu={(e) => onRightClick(e, "HEADER", null, "customChange")}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('customChange'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('customChange')}</button> 
                    <span>CUSTOM % CHG</span>
                  </div>
                  <input 
                    type="date" 
                    value={customDate || ''}
                    onChange={e => setCustomDate(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '2px 4px', fontSize: '0.7rem', width: '105px', boxSizing: 'border-box', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                    title="Select base date for percentage change"
                  />
                </div>
              </th>)}
              {showStatus && (<th className="cursor-pointer" style={getCellStyles("", "status")} data-symbol="_HEADER_" data-colid="status" onContextMenu={(e) => onRightClick(e, "HEADER", null, "status")}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  STATUS <button className="sort-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSort('status'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>{getSortIcon('status')}</button>
                </div>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {paginatedMetrics.map((m: any, index: number) => {
              const matrixRow = matrix?.rows?.[m.instrument];
              const seriesChartData = matrixRow ? matrix?.dates?.map((d: string) => ({
                date: d,
                price: matrixRow.data[d]?.price ?? null,
                seriesChange: matrixRow.data[d]?.seriesChange ?? null
              })) : [];
              const rawYtdData = ytdData && ytdData[m.instrument] ? ytdData[m.instrument] : null;
              
              // 1. TREND (SERIES) CHART DATA
              // The Trend chart must plot ONLY the CURRENT ACTIVE MONTHLY SERIES.
              // It is NOT a yearly chart. It should shrink/reset to fill the width for just the active days.
              const currentActiveSeries = rawYtdData && rawYtdData.series.length > 0 
                ? rawYtdData.series[rawYtdData.series.length - 1] 
                : null;
                
              const trendSeriesChartData = currentActiveSeries ? currentActiveSeries.observations.map((o: any) => o.dailyChange ?? null) : [];
              
              // Dynamically compute min/max per row, bounding at [-2, 3] minimally
              const validTrendData = trendSeriesChartData.filter((d: any) => typeof d === 'number') as number[];
              const rowMin = validTrendData.length > 0 ? Math.min(...validTrendData) : -2;
              const rowMax = validTrendData.length > 0 ? Math.max(...validTrendData) : 3;
              const rowFinalMinY = Math.min(-2, rowMin);
              const rowFinalMaxY = Math.max(3, rowMax);

              // 2. YTD CHART DATA
              // Strictly map only ytdChange into a flat array.
              // We also include explicit reference markers to prove it doesn't use the series reference.
              const ytdChartData = rawYtdData ? rawYtdData.series.flatMap((s: any) => 
                s.observations.map((o: any) => ({
                  date: o.date,
                  price: o.price,
                  ytdChange: o.ytdChange,
                  referenceType: 'YTD',
                  referenceDate: '2026-01-01', // Conceptual start of year
                  referencePrice: null // Can be extracted if needed
                }))
              ) : [];

              return (
                <tr key={m.id || m.instrument} className="table-row cursor-pointer" onClick={() => onSelectInstrument(m.instrument)} onContextMenu={(e) => onRightClick(e, 'ROW', m.instrument, null)}>
                  <td className="col-center text-muted sticky-col-1" onClick={(e) => e.stopPropagation()} style={getCellStyles(m.instrument, 'id')} data-symbol={m.instrument} data-colid="id" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "id")}>
                    {startIndex + index + 1}
                  </td>
                  <td className="col-center sticky-col-2" style={getCellStyles(m.instrument, 'category')} data-symbol={m.instrument} data-colid="category" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "category")}>
                    {editingCategoryFor === (m.id || m.instrument) ? (
                      <input 
                        type="text" 
                        value={editCategoryValue}
                        onChange={e => setEditCategoryValue(e.target.value.toUpperCase())}
                        onBlur={() => saveCategory(m)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCategory(m); if (e.key === 'Escape') setEditingCategoryFor(null); }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        style={{ width: '80px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', textAlign: 'center' }}
                      />
                    ) : (
                      <span 
                        className="badge"
                        onClick={(e) => { e.stopPropagation(); setEditingCategoryFor(m.id || m.instrument); setEditCategoryValue(m.category || ''); }}
                        style={{ cursor: 'pointer', ...getCategoryStyle(m.category || '') }}
                        title="Click to edit category"
                      >
                        {m.category || 'NONE'}
                      </span>
                    )}
                  </td>
                  <td className="sticky-col-3" style={getCellStyles(m.instrument, 'instrument')} data-symbol={m.instrument} data-colid="instrument" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "instrument")}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '8px', gap: '6px' }}>
                      <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => toggleFavourite(e, m.instrument, m.isFavourite)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                        <Star size={14} fill={m.isFavourite ? "#FACC15" : "transparent"} color={m.isFavourite ? "#FACC15" : "#94a3b8"} strokeWidth={m.isFavourite ? 2 : 1.5} />
                      </button>
                      <span className="font-bold">{m.instrument}</span>
                    </div>
                  </td>
                  {/* <td className="text-muted sticky-col-4" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.name}>{m.name || 'Instrument Name'}</td> */}
                  <td className="col-right font-mono font-semibold" style={{ color: '#3b82f6', ...getCellStyles(m.instrument, 'referencePrice') }} data-symbol={m.instrument} data-colid="referencePrice" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "referencePrice")}>{m.referencePrice?.toFixed(2) ?? '—'}</td>
                  <td className="col-right font-mono" style={getCellStyles(m.instrument, 'currentPrice')} data-symbol={m.instrument} data-colid="currentPrice" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "currentPrice")}>{m.currentPrice?.toFixed(2) ?? '—'}</td>
                  {showSessionChange && (<td className="col-right font-mono" style={getCellStyles(m.instrument, 'todayChange')} data-symbol={m.instrument} data-colid="todayChange" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "todayChange")}><FormatPercent value={m.todayChange} status={m.status} /></td>)}
                  {showSessionChart && (<td className="col-center" style={getCellStyles(m.instrument, 'sessionChart')} data-symbol={m.instrument} data-colid="sessionChart" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "sessionChart")}>
                    <div className="sparkline-wrapper">
                      <MatrixSparkline data={trendSeriesChartData} minY={rowFinalMinY} maxY={rowFinalMaxY} width={100} height={24} />
                    </div>
                  </td>)}
                  {showLastSeries && (<td className="col-right font-mono italic" style={getCellStyles(m.instrument, 'lastSeriesChangePercent')} data-symbol={m.instrument} data-colid="lastSeriesChangePercent" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "lastSeriesChangePercent")}>
                    <div className="flex items-center justify-end gap-1.5 opacity-90">
                      <FormatPercent value={m.lastSeriesChangePercent} status={m.status} />
                    </div>
                  </td>)}
                  {showSeriesChange && (<td className="col-right font-mono" style={getCellStyles(m.instrument, 'seriesChange')} data-symbol={m.instrument} data-colid="seriesChange" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "seriesChange")}><FormatPercent value={m.seriesChange} status={m.status} /></td>)}
                  {showSeriesTrend && (<td className="col-center" style={getCellStyles(m.instrument, 'seriesTrend')} data-symbol={m.instrument} data-colid="seriesTrend" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "seriesTrend")}>
                    <div className="sparkline-wrapper">
                      {seriesChartData.length > 0 ? (
                        <Sparkline data={seriesChartData} dataKey="seriesChange" width={100} height={24} showExpiryMarkers={false} tooltipLabel="Series Chg:" />
                      ) : (
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">NO DATA</span>
                      )}
                    </div>
                  </td>)}
                  {showYearlyChart && (
                    <td className="col-center font-mono" style={{ ...getCellStyles(m.instrument, 'ytdChange'), width: '90px' }} data-symbol={m.instrument} data-colid="ytdChange" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "ytdChange")}>
                      <FormatPercent value={m.ytdChange} status={m.status} />
                    </td>
                  )}
                  {showYearlyChart && (
                    <td className="col-center" style={{ ...getCellStyles(m.instrument, 'yearlyChart'), width: '130px' }} data-symbol={m.instrument} data-colid="yearlyChart" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "yearlyChart")}>
                      <div className="sparkline-wrapper">
                        {ytdChartData.length > 0 ? (
                          <Sparkline data={ytdChartData} dataKey="ytdChange" width={120} height={24} showExpiryMarkers={false} tooltipLabel="YTD Change:" />
                        ) : (
                          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">NO YTD DATA</span>
                        )}
                      </div>
                    </td>
                  )}
                  {showCustomChg && (<td className="col-right font-mono" style={{ ...getCellStyles(m.instrument, "customChange"), backgroundColor: getCellStyles(m.instrument, "customChange").backgroundColor || (customDate ? "rgba(59, 130, 246, 0.05)" : "transparent") }} data-symbol={m.instrument} data-colid="customChange" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "customChange")}>
                    {customDate ? <FormatPercent value={m.customChange} status={m.status} /> : <span className="val-neutral text-xs opacity-50">Select Date</span>}
                  </td>)}
                  {showStatus && (<td style={getCellStyles(m.instrument, 'status')} data-symbol={m.instrument} data-colid="status" onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "status")}>
                    <div className="status-cell">
                      <CheckCircle2 size={14} className={m.status === 'VERIFIED' || m.status === 'MOCK' ? 'icon-success' : 'icon-muted'} />
                      <span>{m.status}</span>
                    </div>
                  </td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="panel-footer pagination" style={{ flexShrink: 0 }}>
        <div className="pagination-left">
          <span>Rows per page:</span>
          <select 
            className="pagination-select"
            value={itemsPerPage}
            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
        <div className="pagination-center">
          <button className="page-btn nav" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&laquo;</button>
          <button className="page-btn nav" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lsaquo;</button>
          
          {(() => {
            let startPage = Math.max(1, currentPage - 1);
            let endPage = Math.min(totalPages, startPage + 3);
            if (endPage - startPage < 3) {
              startPage = Math.max(1, endPage - 3);
            }
            const pages = [];
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button 
                  key={i} 
                  className={`page-btn ${currentPage === i ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i)}
                >
                  {i}
                </button>
              );
            }
            return pages;
          })()}
          <button className="page-btn nav" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>&rsaquo;</button>
          <button className="page-btn nav" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>&raquo;</button>
        </div>
        <div className="pagination-right">
          {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </div>
      </div>
      
      {contextMenu && (
        <ContextMenu 
        {...contextMenu} 
        onColor={(color) => {
           const targetKey = contextMenu.scope === 'CELL' ? `CELL:${contextMenu.instrumentSymbol}:${contextMenu.columnId}` : `${contextMenu.scope}:${contextMenu.instrumentSymbol || ''}:${contextMenu.columnId || ''}`;
           if (!selectedCells.has(targetKey)) {
              setSelectedCells(new Set([targetKey]));
           }
           setTimeout(() => handleToolbarFormatChange({ fillColor: color }), 50);
        }}
        onRemoveColor={() => {
           setTimeout(() => handleToolbarClearFormat(), 50);
        }}
      />
      )}
    </div>
  );
}
