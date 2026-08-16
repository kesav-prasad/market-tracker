const fs = require('fs');
const path = './frontend/src/components/dashboard/MainTable.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state for Feature 4 & 5
const stateInsert = `
  const [showSessionChange, setShowSessionChange] = useState(true);
  const [showSessionChart, setShowSessionChart] = useState(true);
  const [showSeriesChange, setShowSeriesChange] = useState(true);
  const [showSeriesTrend, setShowSeriesTrend] = useState(true);
  const [showCustomChg, setShowCustomChg] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

  const saveCategory = async (m: any) => {
    if (!m.id) {
       showToast("Cannot edit: instrument ID missing");
       setEditingCategoryFor(null);
       return;
    }
    const newCat = editCategoryValue.trim();
    if (newCat === m.category) {
       setEditingCategoryFor(null);
       return;
    }
    
    m.category = newCat; // Optimistic update
    setEditingCategoryFor(null);
    try {
       await fetch(\`http://localhost:3001/api/instruments/\${m.id}\`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ category: newCat })
       });
       showToast("Category updated");
    } catch (e) {
       showToast("Failed to update category");
    }
  };
`;

code = code.replace('const [showYearlyChart, setShowYearlyChart] = useState(true);', 'const [showYearlyChart, setShowYearlyChart] = useState(true);\n' + stateInsert);

// 2. Settings Menu Toggles
const togglesUI = `
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>COLUMNS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSessionChange} onChange={e => setShowSessionChange(e.target.checked)} /> SESSION CHANGE
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSessionChart} onChange={e => setShowSessionChart(e.target.checked)} /> SESSION CHART
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
                  <button onClick={() => { setShowSessionChange(true); setShowSessionChart(true); setShowSeriesChange(true); setShowSeriesTrend(true); setShowYearlyChart(true); setShowCustomChg(true); setShowStatus(true); }} style={{ marginTop: '4px', padding: '4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: 'pointer' }}>Show all</button>
                </div>
`;

code = code.replace(/<div style=\{\{ fontWeight: 600, fontSize: '0\.75rem', marginBottom: '8px', color: 'var\(--text-secondary\)' \}\}>COLUMNS<\/div>[\s\S]*?Show Yearly Chart\n\s*<\/label>/m, togglesUI);

// 3. Update Reference Header
code = code.replace(
  /<div style=\{\{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' \}\}> \{getSortIcon\('referencePrice'\)\} REFERENCE<\/div>/,
  '<div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'flex-end\', gap: \'4px\', textAlign: \'right\' }}>{getSortIcon(\'referencePrice\')} <span>REFERENCE<br/><span className="text-[10px] text-slate-400 font-normal">({refDateShort})</span></span></div>'
);

// 4. Update Custom % Chg header
code = code.replace(
  /<th className="col-right cursor-pointer" onClick=\{.*?\} style=\{getCellStyles\("", "customChange"\)\} onContextMenu=\{.*? "customChange"\)\}>/,
  (match) => match.replace('className="col-right cursor-pointer"', 'className="col-right cursor-pointer w-min whitespace-nowrap"')
);

// 5. Update Yearly Chart Header
code = code.replace(
  /<th className="col-center" title="Calendar-year performance from January reference" style=\{getCellStyles\("", "yearlyChart"\)\} onContextMenu=\{.*?"yearlyChart"\)\}>/,
  '<th className="col-center cursor-pointer" onClick={() => handleSort(\'ytdChange\')} title="Calendar-year performance from January reference" style={getCellStyles("", "yearlyChart")} onContextMenu={(e) => onRightClick(e, "COLUMN", null, "yearlyChart")}>'
);
code = code.replace(
  /<span>YEARLY<br\/>CHART<\/span>/,
  '{getSortIcon(\'ytdChange\')}<span>YEARLY<br/>CHART</span>'
);

// 6. Conditionally render TH elements based on toggles
code = code.replace(/<th className="col-right cursor-pointer" onClick=\{\(\) => handleSort\('todayChange'\)\}/, '{showSessionChange && (<th className="col-right cursor-pointer" onClick={() => handleSort(\'todayChange\')}');
code = code.replace(/<\/th>\n\s*<th className="col-center" title="Monthly series performance/, '</th>)}\n              {showSessionChart && (<th className="col-center" title="Monthly series performance');
code = code.replace(/<\/th>\n\s*<th className="col-right cursor-pointer" onClick=\{\(\) => handleSort\('seriesChange'\)\}/, '</th>)}\n              {showSeriesChange && (<th className="col-right cursor-pointer" onClick={() => handleSort(\'seriesChange\')}');
code = code.replace(/<\/th>\n\s*<th className="col-center" title="Cumulative series performance/, '</th>)}\n              {showSeriesTrend && (<th className="col-center" title="Cumulative series performance');
code = code.replace(/<\/th>\n\s*\{showYearlyChart && \(/, '</th>)}\n              {showYearlyChart && (');
code = code.replace(/<th className="col-right cursor-pointer w-min whitespace-nowrap" onClick=\{\(\) => handleSort\('customChange'\)\}/, '{showCustomChg && (<th className="col-right cursor-pointer w-min whitespace-nowrap" onClick={() => handleSort(\'customChange\')}');
code = code.replace(/<\/th>\n\s*<th className="cursor-pointer" onClick=\{\(\) => handleSort\('status'\)\}/, '</th>)}\n              {showStatus && (<th className="cursor-pointer" onClick={() => handleSort(\'status\')}');
code = code.replace(/STATUS \{getSortIcon\('status'\)\}\n\s*<\/div>\n\s*<\/th>/, 'STATUS {getSortIcon(\'status\')}\n                </div>\n              </th>)}');

// 7. Conditionally render TD elements based on toggles
code = code.replace(/<td className="col-right font-mono" style=\{\{ backgroundColor: getCellStyles\(m.instrument, 'todayChange'\)\.backgroundColor \}\} onContextMenu=\{\(e\) => onRightClick\(e, "CELL", m\.instrument, "todayChange"\)\}><FormatPercent value=\{m\.todayChange\} status=\{m\.status\} \/><\/td>/, '{showSessionChange && (<td className="col-right font-mono" style={{ backgroundColor: getCellStyles(m.instrument, \'todayChange\').backgroundColor }} onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "todayChange")}><FormatPercent value={m.todayChange} status={m.status} /></td>)}');
code = code.replace(/<td className="col-center" style=\{\{ backgroundColor: getCellStyles\(m\.instrument, 'sessionChart'\)\.backgroundColor \}\}.*?>\s*<div className="sparkline-wrapper">\s*<MatrixSparkline data=\{trendSeriesChartData\} minY=\{rowFinalMinY\} maxY=\{rowFinalMaxY\} width=\{100\} height=\{24\} \/>\s*<\/div>\s*<\/td>/s, '{showSessionChart && (<td className="col-center" style={{ backgroundColor: getCellStyles(m.instrument, \'sessionChart\').backgroundColor }} onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "sessionChart")}>\n                    <div className="sparkline-wrapper">\n                      <MatrixSparkline data={trendSeriesChartData} minY={rowFinalMinY} maxY={rowFinalMaxY} width={100} height={24} />\n                    </div>\n                  </td>)}');
code = code.replace(/<td className="col-right font-mono" style=\{\{ backgroundColor: getCellStyles\(m\.instrument, 'seriesChange'\)\.backgroundColor \}\} onContextMenu=\{\(e\) => onRightClick\(e, "CELL", m\.instrument, "seriesChange"\)\}><FormatPercent value=\{m\.seriesChange\} status=\{m\.status\} \/><\/td>/, '{showSeriesChange && (<td className="col-right font-mono" style={{ backgroundColor: getCellStyles(m.instrument, \'seriesChange\').backgroundColor }} onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "seriesChange")}><FormatPercent value={m.seriesChange} status={m.status} /></td>)}');
code = code.replace(/<td className="col-center" style=\{\{ backgroundColor: getCellStyles\(m\.instrument, 'seriesTrend'\)\.backgroundColor \}\}.*?>\s*<div className="sparkline-wrapper">\s*\{seriesChartData\.length > 0 \? \(\s*<Sparkline data=\{seriesChartData\} dataKey="seriesChange" width=\{100\} height=\{24\} showExpiryMarkers=\{false\} tooltipLabel="Series Chg:" \/>\s*\) : \(\s*<span className="text-xs text-gray-400 font-medium whitespace-nowrap">NO DATA<\/span>\s*\)\}\s*<\/div>\s*<\/td>/s, '{showSeriesTrend && (<td className="col-center" style={{ backgroundColor: getCellStyles(m.instrument, \'seriesTrend\').backgroundColor }} onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "seriesTrend")}>\n                    <div className="sparkline-wrapper">\n                      {seriesChartData.length > 0 ? (\n                        <Sparkline data={seriesChartData} dataKey="seriesChange" width={100} height={24} showExpiryMarkers={false} tooltipLabel="Series Chg:" />\n                      ) : (\n                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">NO DATA</span>\n                      )}\n                    </div>\n                  </td>)}');
code = code.replace(/<td className="col-right font-mono" style=\{\{ \.\.\.getCellStyles\(m\.instrument, "customChange"\).*?\{customDate \? <FormatPercent value=\{m\.customChange\} status=\{m\.status\} \/> : <span className="val-neutral text-xs opacity-50">Select Date<\/span>\}\s*<\/td>/s, (match) => `{showCustomChg && (${match})}`);
code = code.replace(/<td style=\{\{ backgroundColor: getCellStyles\(m\.instrument, 'status'\)\.backgroundColor \}\}.*?>\s*<div className="status-cell">\s*<CheckCircle2 size=\{14\} className=\{m\.status === 'VERIFIED' \|\| m\.status === 'MOCK' \? 'icon-success' : 'icon-muted'\} \/>\s*<span>\{m\.status\}<\/span>\s*<\/div>\s*<\/td>/s, (match) => `{showStatus && (${match})}`);

// 8. Feature 5: Inline Editable Category
const categoryTD = `
                  <td className="sticky-col-2" style={{ backgroundColor: getCellStyles(m.instrument, 'category').backgroundColor }} onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "category")}>
                    {editingCategoryFor === (m.id || m.instrument) ? (
                      <input 
                        type="text" 
                        value={editCategoryValue}
                        onChange={e => setEditCategoryValue(e.target.value)}
                        onBlur={() => saveCategory(m)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCategory(m); if (e.key === 'Escape') setEditingCategoryFor(null); }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        style={{ width: '80px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                      />
                    ) : (
                      <span 
                        className={\`badge \${m.category === 'INDEX' ? 'badge-blue' : (m.category === 'BULLION' ? 'badge-orange' : 'badge')} \${m.isFavourite ? 'badge-glory' : ''}\`}
                        onClick={(e) => { e.stopPropagation(); setEditingCategoryFor(m.id || m.instrument); setEditCategoryValue(m.category || ''); }}
                        style={{ cursor: 'pointer' }}
                        title="Click to edit category"
                      >
                        {m.category || 'NONE'}
                      </span>
                    )}
                  </td>
`;
code = code.replace(/<td className="sticky-col-2" style=\{\{ backgroundColor: getCellStyles\(m\.instrument, 'category'\)\.backgroundColor \}\}.*?<\/td>/s, categoryTD.trim());

// 9. Fix settings closing when clicking inside
code = code.replace(
  /<div style=\{\{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var\(--surface-color\)'/,
  '<div onClick={(e) => e.stopPropagation()} style={{ position: \'absolute\', right: 0, top: \'100%\', marginTop: \'4px\', background: \'var(--surface-color)\''
);

// 10. Click outside for settings
code = code.replace(
  /\{showSettings && \(/,
  `{showSettings && (
              <>
              <div style={{position: 'fixed', inset: 0, zIndex: 40}} onClick={() => setShowSettings(false)}></div>`
);
code = code.replace(
  /Clear ALL custom colors<\/button>\s*<\/div>\s*\)\}/,
  `Clear ALL custom colors</button>
              </div>
              </>
            )}`
);

fs.writeFileSync(path, code);
console.log("MainTable patched successfully.");
