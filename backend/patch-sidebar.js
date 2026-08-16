const fs = require('fs');
const path = '../frontend/src/components/layout/Sidebar.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
      <div className="sidebar-widget">
        <h3 className="widget-title">DATA HEALTH</h3>
        <ul className="health-list">
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.instrumentsOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.instrumentsOk || 0}/{stats?.totalInstruments || 0} Instruments</div>
            <span className={\`health-status \${stats?.health?.instrumentsOk === stats?.totalInstruments ? 'ok' : 'warn'}\`}>{stats?.health?.instrumentsOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.pricesOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.pricesOk || 0}/{stats?.totalInstruments || 0} Prices</div>
            <span className={\`health-status \${stats?.health?.pricesOk === stats?.totalInstruments ? 'ok' : 'warn'}\`}>{stats?.health?.pricesOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.referencesOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.referencesOk || 0}/{stats?.totalInstruments || 0} References</div>
            <span className={\`health-status \${stats?.health?.referencesOk === stats?.totalInstruments ? 'ok' : 'warn'}\`}>{stats?.health?.referencesOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className="text-green-600" /> Calendar</div>
            <span className="health-status ok">OK</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className="text-green-600" /> Data Source</div>
            <span className="health-status source">Yahoo Finance</span>
          </li>
        </ul>
        <div className="health-btn">ALL SYSTEMS NORMAL</div>
      </div>
`;

code = code.replace(/<div className="sidebar-widget">\s*<h3 className="widget-title">DATA HEALTH<\/h3>[\s\S]*?<div className="health-btn">ALL SYSTEMS NORMAL<\/div>\s*<\/div>/, replacement.trim());
fs.writeFileSync(path, code);
