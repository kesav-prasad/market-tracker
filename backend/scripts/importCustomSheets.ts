import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../src/db';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const YEAR_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - YEAR 26 .csv');
const SERIES_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - SERIES.csv');

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
      return `2026-${(months.indexOf(lastMonth) + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
    }
    return '';
  });
}

async function main() {
  console.log('Starting custom sheets import...');
  const instruments = await prisma.instrument.findMany();
  const symbolMap = new Map(instruments.map(i => [i.symbol, i.id]));

  // Parse YEAR
  const yearContent = fs.readFileSync(YEAR_CSV, 'utf8');
  const yearRecords = parse(yearContent, { skip_empty_lines: true });
  // Include 2Jan (index 9) to 25 (index 35) -> Wait, 35 is index of '25', so slice(9, 36)
  const yearDateHeaders = yearRecords[0].slice(9, 36);
  const yearDates = parseDates(yearDateHeaders);

  let upsertCount = 0;
  
  // Import Year Data
  for (let i = 1; i < yearRecords.length; i++) {
    const row = yearRecords[i];
    const symbolStr = row[4]; // SCRIP is index 4
    if (!symbolStr) continue;
    const symbol = symbolStr.replace('NSE:', '').replace('BSE:', '').trim();
    const instId = symbolMap.get(symbol);
    if (!instId) continue;

    const basePrice = parseFloat(row[3]); // JAN is index 3
    if (isNaN(basePrice)) continue;

    // 1. Insert Jan 1st base price
    await prisma.priceObservation.upsert({
      where: {
        instrumentId_date_source: {
          instrumentId: instId,
          date: new Date('2026-01-01T00:00:00.000Z'),
          source: 'EXCEL'
        }
      },
      update: { price: basePrice, status: 'VERIFIED' },
      create: { instrumentId: instId, date: new Date('2026-01-01T00:00:00.000Z'), price: basePrice, status: 'VERIFIED', source: 'EXCEL', timestamp: new Date() }
    });
    upsertCount++;

    for (let j = 0; j < yearDateHeaders.length; j++) {
      const dateStr = yearDates[j];
      if (!dateStr) continue;

      const pctStr = row[9 + j];
      if (!pctStr || pctStr.trim() === '') continue;
      const pct = parseFloat(pctStr);
      if (isNaN(pct)) continue;

      const price = basePrice * (1 + (pct / 100));

      await prisma.priceObservation.upsert({
        where: {
          instrumentId_date_source: {
            instrumentId: instId,
            date: new Date(dateStr),
            source: 'EXCEL'
          }
        },
        update: { price, status: 'VERIFIED' },
        create: { instrumentId: instId, date: new Date(dateStr), price, status: 'VERIFIED', source: 'EXCEL', timestamp: new Date() }
      });
      upsertCount++;
    }
  }

  console.log(`Upserted ${upsertCount} records from YEAR sheet.`);
}
main().catch(console.error);
