import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../src/db';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SERIES_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - SERIES.csv');
const DAILY_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - DAILY.csv');

const months = ['Jan','Feb','Mar','Apr','May','June','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseDates(headers: string[]): string[] {
  let lastMonth = 'Jan';
  return headers.map(h => {
    const match = h.match(/(\d+)\s*([A-Za-z]*)/);
    if (match) {
      let day = parseInt(match[1]);
      let monthStr = match[2];
      if (monthStr) {
        lastMonth = months.find(m => monthStr.toLowerCase().startsWith(m.toLowerCase())) || monthStr;
      }
      return `2026-${(months.indexOf(lastMonth) + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    return '';
  });
}

async function main() {
  const currentSeries = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });
  if (!currentSeries) return;

  const instruments = await prisma.instrument.findMany();
  const symbolMap = new Map(instruments.map(i => [i.symbol, i.id]));

  // Parse SERIES
  const seriesContent = fs.readFileSync(SERIES_CSV, 'utf8');
  const seriesRecords = parse(seriesContent, { skip_empty_lines: true });
  const seriesDateHeaders = seriesRecords[0].slice(9, 30);
  const seriesDates = parseDates(seriesDateHeaders);

  // Parse DAILY
  const dailyContent = fs.readFileSync(DAILY_CSV, 'utf8');
  const dailyRecords = parse(dailyContent, { skip_empty_lines: true });
  const dailyDateHeaders = dailyRecords[0].slice(9, 30);
  const dailyDates = parseDates(dailyDateHeaders);

  let updatedCount = 0;

  for (let i = 1; i < seriesRecords.length; i++) {
    const sRow = seriesRecords[i];
    
    // Find corresponding row in DAILY
    const symbolStr = sRow[4];
    if (!symbolStr) continue;
    const dRow = dailyRecords.find((r: any) => r[4] === symbolStr);

    const symbol = symbolStr.replace('NSE:', '').replace('BSE:', '').trim();
    const instId = symbolMap.get(symbol);
    if (!instId) continue;

    const basePrice = parseFloat(sRow[3]); // Jul 28 column
    if (isNaN(basePrice)) continue;

    for (let j = 0; j < seriesDateHeaders.length; j++) {
      const dateStr = seriesDates[j];
      if (!dateStr) continue;

      const sPctStr = sRow[9 + j];
      if (!sPctStr || sPctStr.trim() === '') continue; // skip empty cells

      const pct = parseFloat(sPctStr);
      if (isNaN(pct)) continue;

      let seriesChange = pct;
      let price = basePrice * (1 + (pct / 100));

      let todayChange = null;
      if (dRow) {
        const dIndex = dailyDates.indexOf(dateStr);
        if (dIndex !== -1) {
          const dPctStr = dRow[9 + dIndex];
          if (dPctStr && dPctStr.trim() !== '') {
            const dpct = parseFloat(dPctStr);
            if (!isNaN(dpct)) todayChange = dpct;
          }
        }
      }

      const exactDate = new Date(dateStr + 'T00:00:00.000+05:30'); // Midnight IST

      // Upsert DailyMetric
      await prisma.dailyMetric.upsert({
        where: {
          instrumentId_seriesId_date: {
            seriesId: currentSeries.id,
            instrumentId: instId,
            date: exactDate
          }
        },
        update: {
          price: price,
          referencePrice: basePrice,
          seriesChange: seriesChange,
          todayChange: todayChange,
          status: 'VERIFIED'
        },
        create: {
          seriesId: currentSeries.id,
          instrumentId: instId,
          date: exactDate,
          price: price,
          referencePrice: basePrice,
          seriesChange: seriesChange,
          todayChange: todayChange,
          status: 'VERIFIED'
        }
      });
      updatedCount++;
    }
  }
  console.log('Upserted DailyMetrics from spreadsheets. Count:', updatedCount);
}

main().catch(console.error);
