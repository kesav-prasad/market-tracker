import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { MatrixSparkline } from '../MatrixSparkline';
interface DailySeriesMatrixProps {
  matrix: any;
}

function FormatPercent({ value, status }: { value: number | null, status: string }) {
  if (status === 'MISSING') return <span className="matrix-missing">MISSING</span>;
  if (status !== 'VERIFIED' && status !== 'MOCK') return <span className="matrix-error">DATA ERROR</span>;
  if (value === null || isNaN(value)) return <span className="val-neutral">—</span>;
  
  const formatted = value.toFixed(2) + '%';
  if (value > 0) return <span className="text-success font-semibold">+{formatted}</span>;
  if (value < 0) return <span className="text-danger font-semibold">{formatted}</span>;
  return <span className="val-neutral font-semibold">{formatted}</span>;
}

export function DailySeriesMatrix({ matrix }: DailySeriesMatrixProps) {
  // Enforce strict -2 to +3 range as specified in the original design mock-up
  // Do NOT dynamically expand this based on outliers, as that causes small movers (like NIFTYBEES)
  // to be visually flattened into a straight line.
  const finalMinY = -2;
  const finalMaxY = 3;

  return (
    <div className="panel matrix-panel">
      <div className="panel-header matrix-header">
        <div className="matrix-title">
          DAILY SERIES PERFORMANCE (%)
          <Info size={14} className="icon-muted" />
        </div>
      </div>
      
      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky-col">INSTRUMENT</th>
              {matrix?.dates?.map((date: string) => (
                <th key={date} className="col-right whitespace-nowrap">{format(new Date(date), 'dd-MMM')}</th>
              ))}
              <th className="col-center">DAILY TREND</th>
            </tr>
          </thead>
          <tbody>
            {matrix?.rows && Object.keys(matrix.rows).map((symbol) => (
              <tr key={symbol}>
                <td className="sticky-col font-bold">
                  {symbol}
                </td>
                {matrix.dates.map((date: string) => {
                  const cell = matrix.rows[symbol].data[date];
                  return (
                    <td key={date} className="col-right font-mono whitespace-nowrap">
                      {cell ? (
                        <FormatPercent value={cell.todayChange ?? cell.sessionChange} status={cell.status} />
                      ) : (
                        <span className="val-neutral">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="col-center" style={{ width: '120px', minWidth: '120px', padding: '0 8px' }}>
                  <div className="sparkline-wrapper">
                    {matrix.dates.length > 0 && (
                      <MatrixSparkline 
                        data={matrix.dates.map((date: string) => {
                          const cell = matrix.rows[symbol].data[date];
                          return cell ? (cell.todayChange ?? cell.sessionChange) : null;
                        })} 
                        minY={finalMinY}
                        maxY={finalMaxY}
                        width={100} 
                        height={28} 
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-footer matrix-footer">
        <div className="matrix-legend">
          <span><strong>+0.00%</strong>: verified actual zero movement</span>
          <span><strong>—</strong>: non-trading session</span>
          <span><strong className="matrix-missing">MISSING</strong>: expected trading session but observation unavailable</span>
          <span><strong className="matrix-error">DATA ERROR</strong>: provider/API/calculation failure</span>
        </div>
      </div>
    </div>
  );
}
