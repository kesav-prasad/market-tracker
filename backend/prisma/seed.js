const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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

  console.log('Seeding initial instruments...');
  const instruments = [
    { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', category: 'INDEX', exchange: 'NSE', provider: 'Google Sheets', providerSymbol: 'NSE:NIFTYBEES', marketCalendarId: nseCalendar.id, isActive: true },
    { symbol: 'SENSEXBETA', name: 'SBI ETF SENSEX', category: 'SENSEX', exchange: 'BSE', provider: 'Google Sheets', providerSymbol: 'BOM:535276', marketCalendarId: bseCalendar.id, isActive: true },
    { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', category: 'INDEX', exchange: 'NSE', provider: 'Google Sheets', providerSymbol: 'NSE:BANKBEES', marketCalendarId: nseCalendar.id, isActive: true },
    { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', category: 'BULLION', exchange: 'NSE', provider: 'Google Sheets', providerSymbol: 'NSE:GOLDBEES', marketCalendarId: nseCalendar.id, isActive: true },
    { symbol: 'SILVERBEES', name: 'Nippon India Silver ETF', category: 'BULLION', exchange: 'NSE', provider: 'Google Sheets', providerSymbol: 'NSE:SILVERBEES', marketCalendarId: nseCalendar.id, isActive: true }
  ];

  for (const inst of instruments) {
    await prisma.instrument.upsert({
      where: { symbol: inst.symbol },
      update: {
        name: inst.name,
        category: inst.category,
        exchange: inst.exchange,
        provider: inst.provider,
        providerSymbol: inst.providerSymbol,
        marketCalendarId: inst.marketCalendarId,
        isActive: inst.isActive
      },
      create: inst
    });
  }

  // Create an initial series covering July 28 to Aug 25
  const series = await prisma.series.findFirst();
  if (!series) {
    await prisma.series.create({
      data: {
        referenceDate: new Date('2026-07-28T00:00:00'), // Ref is July 27
        expectedExpiryDate: new Date('2026-08-25T00:00:00'),
        isFinalized: false
      }
    });
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
