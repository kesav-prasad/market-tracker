import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  List,
  Calendar,
  History,
  FileText,
  Archive,
  Star,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface SidebarProps {
  stats?: any;
}

export function Sidebar({ stats }: SidebarProps) {
  const loc = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Favourites', path: '/favourites', icon: <Star size={18} /> },
    { name: 'Instruments', path: '/instruments', icon: <List size={18} /> },
    { name: 'Calendar', path: '/calendar', icon: <Calendar size={18} /> },
    { name: 'Series History', path: '/history', icon: <History size={18} /> },
    { name: 'Archives', path: '/archives', icon: <Archive size={18} /> },
    { name: 'Data Audit', path: '/audit', icon: <ShieldCheck size={18} /> },
  ];

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav" style={{ flex: '1 0 auto' }}>
        {navItems.map(item => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-item ${loc.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-widget">
        <h3 className="widget-title">DATA HEALTH</h3>
        <ul className="health-list">
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.instrumentsOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.instrumentsOk || 0}/{stats?.totalInstruments || 0} Instruments</div>
            <span className={`health-status ${stats?.health?.instrumentsOk === stats?.totalInstruments ? 'ok' : 'warn'}`}>{stats?.health?.instrumentsOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.pricesOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.pricesOk || 0}/{stats?.totalInstruments || 0} Prices</div>
            <span className={`health-status ${stats?.health?.pricesOk === stats?.totalInstruments ? 'ok' : 'warn'}`}>{stats?.health?.pricesOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
          </li>
          <li>
            <div className="health-left"><CheckCircle2 size={14} className={stats?.health?.referencesOk === stats?.totalInstruments ? "text-green-600" : "text-yellow-500"} /> {stats?.health?.referencesOk || 0}/{stats?.totalInstruments || 0} References</div>
            <span className={`health-status ${stats?.health?.referencesOk === stats?.totalInstruments ? 'ok' : 'warn'}`}>{stats?.health?.referencesOk === stats?.totalInstruments ? 'OK' : 'WARN'}</span>
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

      <div className="sidebar-widget">
        <h3 className="widget-title">QUICK STATS</h3>
        <ul className="stats-list">
          <li>
            <span>Total Instruments</span>
            <strong>{stats?.totalInstruments || 0}</strong>
          </li>
          <li>
            <span>Series Days</span>
            <strong>{stats?.seriesDays || 0}</strong>
          </li>
          <li>
            <span>Data Points</span>
            <strong>{stats?.dataPoints?.toLocaleString() || 0}</strong>
          </li>
          <li>
            <span>Last Sync</span>
            <strong>{stats?.lastSync ? format(new Date(stats.lastSync), 'hh:mm a') : '—'}</strong>
          </li>
        </ul>
      </div>
    </aside>
  );
}
