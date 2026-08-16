import React, { useState } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Eraser, Paintbrush } from 'lucide-react';

export interface FormatState {
  fillColor?: string | null;
  textColor?: string | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  textAlign?: string | null;
  borders?: string | null;
}

interface FormattingToolbarProps {
  onFormatChange: (updates: Partial<FormatState>) => void;
  onClearFormat: () => void;
  onFormatPainter: () => void;
  isFormatPainterActive: boolean;
  selectedCount: number;
  activeFormat?: Partial<FormatState>;
}

const COLORS = [
  '#ffffff', '#f8fafc', '#94a3b8', '#475569', '#0f172a', // Grays
  '#fecaca', '#ef4444', '#991b1b', // Reds
  '#fed7aa', '#f97316', '#c2410c', // Oranges
  '#fef08a', '#eab308', '#a16207', // Yellows
  '#bbf7d0', '#22c55e', '#166534', // Greens
  '#bfdbfe', '#3b82f6', '#1e40af', // Blues
  '#e9d5ff', '#a855f7', '#6b21a8', // Purples
];

export function FormattingToolbar({ 
  onFormatChange, 
  onClearFormat, 
  onFormatPainter, 
  isFormatPainterActive,
  selectedCount,
  activeFormat = {}
}: FormattingToolbarProps) {
  const [showFillPicker, setShowFillPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);

  if (selectedCount === 0) return null;

  const btnStyle = {
    background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-color)'
  };

  const activeBtnStyle = { ...btnStyle, background: 'var(--border-color)' };

  const ColorPicker = ({ onSelect, onClose, label }: any) => (
    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '220px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {COLORS.map(c => (
          <div key={c} onClick={() => { onSelect(c); onClose(); }} style={{ width: '20px', height: '20px', backgroundColor: c, border: '1px solid var(--border-color)', borderRadius: '2px', cursor: 'pointer' }} title={c} />
        ))}
      </div>
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="color" onChange={(e) => onSelect(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none' }} />
        <span style={{ fontSize: '0.75rem' }}>Custom</span>
      </div>
      <button onClick={() => { onSelect(null); onClose(); }} style={{ marginTop: '8px', width: '100%', padding: '4px', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
        No Color
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', margin: '0 8px' }}>
      
      {/* Fill Color */}
      <div style={{ position: 'relative' }}>
        <button style={btnStyle} onClick={() => { setShowFillPicker(!showFillPicker); setShowTextPicker(false); }} title="Fill Color">
          <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--primary-color)', border: '1px solid var(--border-color)', borderRadius: '2px' }} />
        </button>
        {showFillPicker && (
          <>
            <div style={{position: 'fixed', inset: 0, zIndex: 40}} onClick={() => setShowFillPicker(false)} />
            <ColorPicker label="Fill Color" onSelect={(c: string) => onFormatChange({ fillColor: c })} onClose={() => setShowFillPicker(false)} />
          </>
        )}
      </div>

      {/* Text Color */}
      <div style={{ position: 'relative' }}>
        <button style={btnStyle} onClick={() => { setShowTextPicker(!showTextPicker); setShowFillPicker(false); }} title="Text Color">
          <span style={{ fontWeight: 800, fontSize: '14px', borderBottom: '3px solid var(--primary-color)', padding: '0 2px' }}>A</span>
        </button>
        {showTextPicker && (
          <>
            <div style={{position: 'fixed', inset: 0, zIndex: 40}} onClick={() => setShowTextPicker(false)} />
            <ColorPicker label="Text Color" onSelect={(c: string) => onFormatChange({ textColor: c })} onClose={() => setShowTextPicker(false)} />
          </>
        )}
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

      <button style={activeFormat.fontWeight === 'bold' ? activeBtnStyle : btnStyle} onClick={() => onFormatChange({ fontWeight: activeFormat.fontWeight === 'bold' ? null : 'bold' })} title="Bold (Ctrl+B)">
        <Bold size={16} />
      </button>
      <button style={activeFormat.fontStyle === 'italic' ? activeBtnStyle : btnStyle} onClick={() => onFormatChange({ fontStyle: activeFormat.fontStyle === 'italic' ? null : 'italic' })} title="Italic (Ctrl+I)">
        <Italic size={16} />
      </button>

      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

      <button style={activeFormat.textAlign === 'left' ? activeBtnStyle : btnStyle} onClick={() => onFormatChange({ textAlign: activeFormat.textAlign === 'left' ? null : 'left' })} title="Align Left">
        <AlignLeft size={16} />
      </button>
      <button style={activeFormat.textAlign === 'center' ? activeBtnStyle : btnStyle} onClick={() => onFormatChange({ textAlign: activeFormat.textAlign === 'center' ? null : 'center' })} title="Align Center">
        <AlignCenter size={16} />
      </button>
      <button style={activeFormat.textAlign === 'right' ? activeBtnStyle : btnStyle} onClick={() => onFormatChange({ textAlign: activeFormat.textAlign === 'right' ? null : 'right' })} title="Align Right">
        <AlignRight size={16} />
      </button>

      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

      <button style={isFormatPainterActive ? activeBtnStyle : btnStyle} onClick={onFormatPainter} title="Format Painter">
        <Paintbrush size={16} />
      </button>
      <button style={btnStyle} onClick={onClearFormat} title="Clear Formatting (Backspace)">
        <Eraser size={16} color="var(--danger-color)" />
      </button>
      
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
        {selectedCount} selected
      </div>
    </div>
  );
}
