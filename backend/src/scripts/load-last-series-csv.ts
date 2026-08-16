import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../../last-series-data.csv');
  console.log(`Loading CSV from ${filePath}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true
  });

  const headers = records[0];
  console.log('Headers:', headers);

  // Find the exact index of '28 Jul' or '28 July'
  let targetColIdx = -1;
  let symbolColIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (h.toLowerCase().includes('28 jul')) {
      targetColIdx = i;
    }
    if (h === 'SCRIP' || h.toLowerCase().includes('10-08-26')) {
      // Actually let's just find where NIFTYBEES is in row 1
    }
  }

  // Row 1 is data: 0,INDEX,NIFTYBEES,274,NSE:NIFTYBEES,...
  // We can just rely on column 2 for symbol and column targetColIdx for value.
  symbolColIdx = 2; 

  console.log(`Using symbolColIdx=${symbolColIdx}, targetColIdx=${targetColIdx} ("${headers[targetColIdx]}")`);

  if (targetColIdx === -1) {
    throw new Error('Could not find column for 28 Jul');
  }

  const lastSeriesDate = new Date('2026-07-28T00:00:00Z');

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const symbol = row[symbolColIdx]?.trim();
    const valueStr = row[targetColIdx]?.trim();

    if (!symbol) continue;

    let value = parseFloat(valueStr);
    if (isNaN(value) || valueStr === '#N/A') {
      value = null as unknown as number; // prisma accepts null
    }

    try {
      const updated = await prisma.instrument.update({
        where: { symbol },
        data: {
          lastSeriesChangePercent: value,
          lastSeriesEndDate: value !== null ? lastSeriesDate : null
        }
      });
      console.log(`Updated ${symbol}: lastSeriesChangePercent = ${value}`);
    } catch (err: any) {
      if (err.code === 'P2025') {
        console.warn(`Symbol not found in DB: ${symbol}`);
      } else {
        console.error(`Error updating ${symbol}: ${err.message}`);
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
