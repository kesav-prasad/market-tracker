const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// The CSV is located in the root folder, backend is in /backend
const csvPath = path.join(__dirname, '..', 'PANGU MKT - DAILY.csv');

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}`);
  }
  
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l);

  console.log('Seeding initial market calendars...');
  const nseCalendar = await prisma.marketCalendar.upsert({
    where: { name: 'NSE Equity' },
    update: {},
    create: { name: 'NSE Equity', timezone: 'Asia/Kolkata' }
  });

  const bseCalendar = await prisma.marketCalendar.upsert({
    where: { name: 'BSE Equity' },
    update: {},
    create: { name: 'BSE Equity', timezone: 'Asia/Kolkata' }
  });

  console.log(`Found ${lines.length - 1} data rows. Importing...`);
  
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser
    let row = [];
    let cur = '';
    let inQuotes = false;
    for(let j=0; j<line.length; j++) {
      if(line[j] === '"') inQuotes = !inQuotes;
      else if(line[j] === ',' && !inQuotes) { row.push(cur); cur = ''; }
      else cur += line[j];
    }
    row.push(cur);
    
    if(row.length < 5) continue;
    
    let category = row[1];
    let providerSymbol = row[4]; // 'NSE:NIFTYBEES'
    if(!providerSymbol || !providerSymbol.includes(':')) continue;
    
    let [exchange, symbol] = providerSymbol.split(':');
    let name = symbol; // We don't have the full name in CSV, fallback to symbol
    
    let marketCalendarId = exchange === 'BSE' ? bseCalendar.id : nseCalendar.id;
    
    await prisma.instrument.upsert({
      where: { symbol: symbol },
      update: { category, exchange, providerSymbol, marketCalendarId, isActive: true },
      create: { symbol, name, category, exchange, provider: 'Google Sheets', providerSymbol, marketCalendarId, isActive: true }
    });
    imported++;
  }
  
  // Create an initial series covering July 28 to Aug 25
  const series = await prisma.series.findFirst();
  if (!series) {
    await prisma.series.create({
      data: {
        referenceDate: new Date('2026-07-28T00:00:00'),
        expectedExpiryDate: new Date('2026-08-25T00:00:00'),
        isFinalized: false
      }
    });
  }
  
  console.log(`Imported ${imported} companies successfully.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
