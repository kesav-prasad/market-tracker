import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../src/db';
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const YEAR_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - YEAR 26 .csv');
const SERIES_CSV = path.join(PROJECT_ROOT, 'PANGU MKT - SERIES.csv');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function parseDates(headers) {
    let lastMonth = 'Jan';
    return headers.map(h => {
        const match = h.match(/(\d+)\s*([A-Za-z]*)/);
        if (match) {
            let day = parseInt(match[1]);
            let monthStr = match[2];
            if (monthStr) {
                lastMonth = months.find(m => monthStr.toLowerCase().startsWith(m.toLowerCase())) || monthStr;
            }
            return `2026-${(months.indexOf(lastMonth) + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T18:30:00.000Z`;
        }
        return '';
    });
}
async function main() {
    console.log('Starting custom sheets import...');
    // 1. Parse YEAR sheet
    const yearContent = fs.readFileSync(YEAR_CSV, 'utf8');
    const yearRecords = parse(yearContent, { skip_empty_lines: true });
    const yearHeaders = yearRecords[0];
    const yearDateHeaders = yearHeaders.slice(9, 37);
    const yearDates = parseDates(yearDateHeaders);
    // 2. Parse SERIES sheet
    const seriesContent = fs.readFileSync(SERIES_CSV, 'utf8');
    const seriesRecords = parse(seriesContent, { skip_empty_lines: true });
    const seriesHeaders = seriesRecords[0];
    const seriesDateHeaders = seriesHeaders.slice(9, 30);
    const seriesDates = parseDates(seriesDateHeaders);
    const instruments = await prisma.instrument.findMany();
    const symbolMap = new Map(instruments.map(i => [i.symbol, i.id]));
    let upsertCount = 0;
    // Import Year Data (Jan to June)
    for (let i = 1; i < yearRecords.length; i++) {
        const row = yearRecords[i];
        const symbolStr = row[4];
        if (!symbolStr)
            continue;
        const symbol = symbolStr.replace('NSE:', '').replace('BSE:', '').trim();
        const instId = symbolMap.get(symbol);
        if (!instId)
            continue;
        const basePrice = parseFloat(row[3]); // JAN column
        if (isNaN(basePrice))
            continue;
        for (let j = 0; j < yearDateHeaders.length; j++) {
            const dateStr = yearDates[j];
            if (!dateStr)
                continue;
            // Only process Jan - June from YEAR sheet
            const monthStr = yearDateHeaders[j].match(/[A-Za-z]+/)?.[0];
            if (monthStr && monthStr.toLowerCase().startsWith('jul'))
                break; // Stop at July
            const pctStr = row[9 + j];
            if (!pctStr || pctStr.trim() === '')
                continue;
            const pct = parseFloat(pctStr);
            if (isNaN(pct))
                continue;
            const price = basePrice * (1 + (pct / 100));
            await prisma.priceObservation.upsert({
                where: {
                    instrumentId_date_source: {
                        instrumentId: instId,
                        date: new Date(dateStr),
                        source: 'EXCEL'
                    }
                },
                update: {
                    price,
                    status: 'VERIFIED'
                },
                create: {
                    instrumentId: instId,
                    date: new Date(dateStr),
                    price,
                    status: 'VERIFIED',
                    source: 'EXCEL',
                    timestamp: new Date()
                }
            });
            upsertCount++;
        }
    }
    console.log(`Upserted ${upsertCount} records from YEAR sheet.`);
    let seriesUpsertCount = 0;
    // Import Series Data (Jul 28 to Aug 25)
    for (let i = 1; i < seriesRecords.length; i++) {
        const row = seriesRecords[i];
        const symbolStr = row[4];
        if (!symbolStr)
            continue;
        const symbol = symbolStr.replace('NSE:', '').replace('BSE:', '').trim();
        const instId = symbolMap.get(symbol);
        if (!instId)
            continue;
        const basePrice = parseFloat(row[3]); // Jul 28 column
        if (isNaN(basePrice))
            continue;
        for (let j = 0; j < seriesDateHeaders.length; j++) {
            const dateStr = seriesDates[j];
            if (!dateStr)
                continue;
            const pctStr = row[9 + j];
            if (!pctStr || pctStr.trim() === '')
                continue;
            const pct = parseFloat(pctStr);
            if (isNaN(pct))
                continue;
            const price = basePrice * (1 + (pct / 100));
            await prisma.priceObservation.upsert({
                where: {
                    instrumentId_date_source: {
                        instrumentId: instId,
                        date: new Date(dateStr),
                        source: 'EXCEL'
                    }
                },
                update: {
                    price,
                    status: 'VERIFIED'
                },
                create: {
                    instrumentId: instId,
                    date: new Date(dateStr),
                    price,
                    status: 'VERIFIED',
                    source: 'EXCEL',
                    timestamp: new Date()
                }
            });
            seriesUpsertCount++;
        }
    }
    console.log(`Upserted ${seriesUpsertCount} records from SERIES sheet.`);
    console.log('Import completed.');
}
main().catch(console.error);
