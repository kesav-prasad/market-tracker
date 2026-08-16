process.env.TZ = 'Asia/Kolkata';
import prisma from './db';
import { MarketCalendarService } from './services/MarketCalendarService';
import { SeriesEngine } from './services/SeriesEngine';

async function main() {
  console.log('Seeding database...');

  // 0. Seed Market Calendar
  await prisma.marketCalendar.upsert({
    where: { name: 'NSE Equity' },
    update: {},
    create: {
      name: 'NSE Equity',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log('Market calendar seeded.');

  // 1. Seed Instruments
  const defaultInstruments = [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', category: 'INDEX' },
    { symbol: 'SENSEXBETA', name: 'Sensex ETF', category: 'SENSEX' },
    { symbol: 'BANKBEES', name: 'Bank Nifty ETF', category: 'INDEX' },
    { symbol: 'GOLDBEES', name: 'Gold ETF', category: 'BULLION' },
    { symbol: 'SILVERBEES', name: 'Silver ETF', category: 'BULLION' },
    { symbol: 'POWERINDIA', name: 'Power India', category: 'EQUITY' },
  ];

  for (const inst of defaultInstruments) {
    await prisma.instrument.upsert({
      where: { symbol: inst.symbol },
      update: {},
      create: {
        symbol: inst.symbol,
        name: inst.name,
        category: inst.category,
        exchange: 'NSE',
        currency: 'INR',
        displayPrecision: 2,
      },
    });
  }

  const vedl = await prisma.instrument.upsert({
    where: { symbol: 'VEDL' },
    update: {},
    create: { symbol: 'VEDL', name: 'Vedanta Ltd', category: 'METAL', exchange: 'NSE', provider: 'YAHOO_FINANCE', providerSymbol: 'VEDL.NS', marketCalendarId: 1 }
  });

  // Seed Corporate Action Factor for VEDL
  await prisma.corporateActionFactor.upsert({
    where: {
      instrumentId_date: {
        instrumentId: vedl.id,
        date: new Date('2026-04-30T18:30:00.000Z') // The date of the massive drop/demerger
      }
    },
    update: {
      adjustmentFactor: 0.360076,
      reason: 'Demerger Adjustment to match Google Finance'
    },
    create: {
      instrumentId: vedl.id,
      date: new Date('2026-04-30T18:30:00.000Z'),
      adjustmentFactor: 0.360076,
      reason: 'Demerger Adjustment to match Google Finance'
    }
  });
  console.log('Instruments and Corporate Actions seeded.');

  // 2. Initialize current series
  // Simulating startup logic
  console.log('Determining current series...');
  const today = new Date();
  const currentSeries = await SeriesEngine.getCurrentSeries(today);
  
  const existingSeries = await prisma.series.findFirst({
    where: {
      referenceDate: currentSeries.referenceDate,
      expectedExpiryDate: currentSeries.expectedExpiryDate,
    }
  });

  if (!existingSeries) {
    await prisma.series.create({
      data: {
        referenceDate: currentSeries.referenceDate,
        expectedExpiryDate: currentSeries.expectedExpiryDate,
        isFinalized: false,
      }
    });
    console.log('Created new series starting at:', currentSeries.referenceDate.toISOString());
  } else {
    console.log('Active series already exists.');
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
