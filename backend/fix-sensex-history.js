const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  
  // Upsert for Aug 7 (prev trading day to Aug 10)
  const aug7 = new Date('2026-08-06T18:30:00.000Z');
  await prisma.priceObservation.upsert({
    where: {
      instrumentId_date_source: {
        instrumentId: inst.id,
        date: aug7,
        source: 'YAHOO_FINANCE'
      }
    },
    update: { price: 80.92, status: 'VERIFIED' },
    create: {
      instrumentId: inst.id,
      date: aug7,
      source: 'YAHOO_FINANCE',
      price: 80.92,
      status: 'VERIFIED',
      timestamp: new Date()
    }
  });
  
  // Upsert for Aug 10
  const aug10 = new Date('2026-08-09T18:30:00.000Z');
  await prisma.priceObservation.upsert({
    where: {
      instrumentId_date_source: {
        instrumentId: inst.id,
        date: aug10,
        source: 'YAHOO_FINANCE'
      }
    },
    update: { price: 80.85, status: 'VERIFIED' },
    create: {
      instrumentId: inst.id,
      date: aug10,
      source: 'YAHOO_FINANCE',
      price: 80.85,
      status: 'VERIFIED',
      timestamp: new Date()
    }
  });

  const { DataIngestionService } = require('./dist/services/DataIngestionService');
  const service = new DataIngestionService();
  await service.ingestDataForDate(aug10);
  
  // Re-ingest Aug 11
  const aug11 = new Date('2026-08-10T18:30:00.000Z');
  await service.ingestDataForDate(aug11);

  console.log('Fixed SENSEXBETA history');
}
run();
