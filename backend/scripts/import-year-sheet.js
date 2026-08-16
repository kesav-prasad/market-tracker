const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const headerToDate = {
  '27Jan': '2026-01-27T00:00:00Z',
  '24 Feb': '2026-02-24T00:00:00Z',
  '30Mar': '2026-03-30T00:00:00Z',
  '28 Apr': '2026-04-28T00:00:00Z',
  '26 May': '2026-05-26T00:00:00Z',
  '30 June': '2026-06-30T00:00:00Z',
  '28Jul': '2026-07-28T00:00:00Z',
  '29Jul': '2026-07-29T00:00:00Z',
  '30': '2026-07-30T00:00:00Z',
  '31': '2026-07-31T00:00:00Z',
  '3 Aug': '2026-08-03T00:00:00Z',
  '4': '2026-08-04T00:00:00Z',
  '5': '2026-08-05T00:00:00Z',
  '6': '2026-08-06T00:00:00Z',
  '7': '2026-08-07T00:00:00Z',
  '10': '2026-08-10T00:00:00Z'
};

async function main() {
  const csvPath = path.join(__dirname, '../../year sheet.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf8');

  const records = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  const headers = records[0];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const symbol = row[2]?.trim();
    if (!symbol) continue;

    const baseStr = row[3]?.trim();
    const basePrice = parseFloat(baseStr);
    if (isNaN(basePrice) || basePrice <= 0) continue;

    let inst = await prisma.instrument.findUnique({
      where: { symbol }
    });
    if (!inst) {
      inst = await prisma.instrument.create({
         data: {
            symbol: symbol,
            name: row[4]?.trim() || symbol,
            category: row[1]?.trim() || 'GENERAL'
         }
      });
    }

    await prisma.priceObservation.upsert({
      where: {
        instrumentId_date_source: {
          instrumentId: inst.id,
          source: 'EXCEL',
          date: new Date('2026-01-01T00:00:00Z')
        }
      },
      update: { price: basePrice, status: 'ACTUAL' },
      create: {
        instrumentId: inst.id,
        source: 'EXCEL',
        date: new Date('2026-01-01T00:00:00Z'),
        price: basePrice,
        status: 'ACTUAL',
        timestamp: new Date()
      }
    });

    for (let col = 10; col <= 25; col++) {
      const header = headers[col];
      const dateStr = headerToDate[header];
      if (!dateStr) continue;

      let pctChangeStr = row[col]?.trim();
      if (!pctChangeStr || pctChangeStr === '#N/A') continue;

      const pctChange = parseFloat(pctChangeStr);
      if (isNaN(pctChange)) continue;

      const price = basePrice * (1 + (pctChange / 100));
      
      await prisma.priceObservation.upsert({
        where: {
          instrumentId_date_source: {
            instrumentId: inst.id,
            source: 'EXCEL',
            date: new Date(dateStr)
          }
        },
        update: { price: price, status: 'ACTUAL' },
        create: {
          instrumentId: inst.id,
          source: 'EXCEL',
          date: new Date(dateStr),
          price: price,
          status: 'ACTUAL',
          timestamp: new Date()
        }
      });
    }
  }
  
  console.log('Finished importing year sheet data.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
