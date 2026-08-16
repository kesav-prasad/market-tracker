import React, { useEffect, useRef } from 'react';

export interface ContextMenuProps {
  x: number;
  y: number;
  scope: 'CELL' | 'ROW' | 'COLUMN' | 'HEADER';
  instrumentSymbol: string | null;
  columnId: string | null;
  onClose: () => void;
  onDelete?: () => void;
  onColor?: (color: string) => void;
  onRemoveColor?: () => void;
}

export function ContextMenu({
  x, y, instrumentSymbol, onClose, onDelete, onColor, onRemoveColor
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div 
      className="context-menu"
      ref={menuRef}
      style={{
        position: 'fixed',
        top: Math.min(y, window.innerHeight - 150),
        left: Math.min(x, window.innerWidth - 200),
        backgroundColor: 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: 9999,
        minWidth: '160px',
        padding: '4px 0',
        fontSize: '0.85rem'
      }}
    >
      {(onColor || onRemoveColor) && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cell Color</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
             {colors.map(c => (
               <div 
                 key={c}
                 onClick={(e) => { e.stopPropagation(); if (onColor) onColor(c); onClose(); }}
                 style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: c, cursor: 'pointer' }}
               />
             ))}
             <input type="color" onChange={(e) => { if (onColor) onColor(e.target.value); onClose(); }} style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }} title="Custom Color" />
          </div>
          {onRemoveColor && (
             <div 
               style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-color)' }}
               onClick={(e) => { e.stopPropagation(); onRemoveColor(); onClose(); }}
             >
               Remove Color
             </div>
          )}
        </div>
      )}
      
      {onDelete && instrumentSymbol && (
        <div 
          className="menu-item" 
          style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background 0.2s', color: 'var(--danger-color)', fontWeight: 600 }} 
          onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
        >
          Delete {instrumentSymbol}
        </div>
      )}
    </div>
  );
}
