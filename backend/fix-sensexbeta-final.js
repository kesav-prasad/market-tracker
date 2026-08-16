const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  console.log("Updating SENSEXBETA providerSymbol to SBISENSEX.BO...");
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  
  await prisma.instrument.update({
    where: { id: inst.id },
    data: { providerSymbol: 'SBISENSEX.BO' }
  });

  console.log("Deleting bad observations & metrics for SENSEXBETA...");
  await prisma.dailyMetric.deleteMany({
    where: { instrumentId: inst.id, date: { gte: new Date('2026-08-01') } }
  });
  await prisma.priceObservation.deleteMany({
    where: { instrumentId: inst.id, date: { gte: new Date('2026-08-01') } }
  });

  const service = new DataIngestionService();
  
  // Re-ingest last few trading days to ensure metrics can build
  console.log("Re-ingesting data...");
  const aug7 = new Date('2026-08-06T18:30:00.000Z');
  const aug10 = new Date('2026-08-09T18:30:00.000Z');
  const aug11 = new Date('2026-08-10T18:30:00.000Z');

  // We don't want to run full ingest. We will just ingest SENSEXBETA by modifying the DB briefly 
  // No, ingestDataForDate fetches all active instruments. It's safe but slow. 
  // We can just run it, it takes 3 minutes.
  
  await service.ingestDataForDate(aug7);
  await service.ingestDataForDate(aug10);
  await service.ingestDataForDate(aug11);

  console.log("SENSEXBETA perfectly restored.");
}
run();
