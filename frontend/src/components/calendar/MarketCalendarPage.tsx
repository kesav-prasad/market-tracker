import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, getYear, getMonth, isSameDay } from 'date-fns';

export function MarketCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const activeCalendarId = 1; // Default to NSE Equity

  const fetchCalendar = async (date: Date) => {
    setLoading(true);
    try {
      const year = getYear(date);
      const month = getMonth(date) + 1; // 1-indexed for our API
      
      const [calRes, healthRes] = await Promise.all([
        fetch(`http://localhost:3001/api/calendar/${activeCalendarId}/${year}/${month}`),
        fetch(`http://localhost:3001/api/calendar/health/${activeCalendarId}`)
      ]);

      const calJson = await calRes.json();
      const healthJson = await healthRes.json();

      if (calJson.success) setCalendarData(calJson.data);
      if (healthJson.success) setHealthData(healthJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(currentDate);
  }, [currentDate]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/calendar/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: holidayDate,
          description: holidayDesc,
          marketCalendarId: activeCalendarId
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsHolidayModalOpen(false);
        setHolidayDate('');
        setHolidayDesc('');
        fetchCalendar(currentDate); // refresh
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Error adding holiday');
    }
  };

  const handleRemoveHoliday = async (dateStr: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/calendar/holiday/${dateStr}?marketCalendarId=${activeCalendarId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchCalendar(currentDate);
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Error removing holiday');
    }
  };

  const getDayStatusStyle = (status: string) => {
    switch(status) {
      case 'TRADING DAY': return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', label: 'TRADING' };
      case 'WEEKEND': return { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', label: 'WEEKEND' };
      case 'HOLIDAY': return { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', label: 'HOLIDAY' };
      case 'SPECIAL': return { bg: '#fef3c7', border: '#fde68a', text: '#92400e', label: 'SPECIAL' };
      default: return { bg: '#ffffff', border: '#e2e8f0', text: '#000000', label: status };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Calendar Grid Area */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={20} className="text-primary" /> Market Calendar
            </h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Trading sessions and boundaries</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn-icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft size={20} />
            </button>
            <strong style={{ fontSize: '1.125rem', minWidth: '140px', textAlign: 'center' }}>
              {format(currentDate, 'MMMM yyyy').toUpperCase()}
            </strong>
            <button className="btn-icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight size={20} />
            </button>
            <button className="btn-primary" style={{ marginLeft: '16px' }} onClick={() => setIsHolidayModalOpen(true)}>
              <Plus size={16} /> Add Holiday
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading calendar data...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '8px' }}>
                  {day}
                </div>
              ))}
              
              {/* Padding for first day offset */}
              {calendarData && Array.from({ length: new Date(calendarData.days[0].date).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {/* Actual Days */}
              {calendarData?.days.map((day: any) => {
                const style = getDayStatusStyle(day.status);
                const isToday = isSameDay(new Date(day.date), new Date());
                const isExpiry = isSameDay(new Date(day.date), new Date(calendarData.expectedExpiry));

                return (
                  <div key={day.date} style={{ 
                    border: `1px solid ${style.border}`, 
                    backgroundColor: style.bg, 
                    borderRadius: '8px', 
                    padding: '12px',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: style.text }}>
                        {format(new Date(day.date), 'd')}
                      </span>
                      {isToday && <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary-color)', borderRadius: '50%' }}></span>}
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: style.text, padding: '2px 4px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '4px', width: 'fit-content' }}>
                        {style.label}
                      </span>
                      {day.status === 'HOLIDAY' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: style.text, lineHeight: 1.1 }}>
                            {day.holidayName}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveHoliday(format(new Date(day.date), 'yyyy-MM-dd')); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: style.text, opacity: 0.7, padding: 0 }}
                            title="Remove Holiday"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                      {day.isTradingDay && (
                        <span style={{ fontSize: '0.65rem', color: style.text, opacity: 0.8 }}>
                          {day.openTime} - {day.closeTime}
                        </span>
                      )}
                      {isExpiry && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px', textAlign: 'center', borderRadius: '2px', marginTop: '4px' }}>
                          EXPIRY BOUNDARY
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side Widgets Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Active Series Panel */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 className="widget-title" style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>ACTIVE SERIES INFO</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expected Expiry</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {calendarData?.expectedExpiry ? format(new Date(calendarData.expectedExpiry), 'dd-MMM-yyyy') : 'Calculating...'}
              </strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Calculation Rule</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--primary-color)' }}>Last valid Tuesday</span>
            </div>
          </div>
        </div>

        {/* Audit Panel */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 className="widget-title" style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>CALENDAR AUDIT</h3>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              {healthData?.isActive ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
              {healthData?.calendarName || 'Unknown'} Active
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              <CheckCircle2 size={16} className="text-success" />
              Timezone: {healthData?.timezone || 'IST'}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              {healthData?.holidayDataVerified ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
              Holiday Data Verified
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              {healthData?.currentSeriesValid ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
              Current Series Valid
            </li>
          </ul>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isHolidayModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Register Market Holiday</h3>
            <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>DATE</label>
                <input required type="date" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={holidayDate} onChange={e => setHolidayDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>HOLIDAY NAME / DESCRIPTION</label>
                <input required type="text" className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} placeholder="e.g. Independence Day" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsHolidayModalOpen(false)} className="toolbar-btn">Cancel</button>
                <button type="submit" className="btn-primary">Add Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
