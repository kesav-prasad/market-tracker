const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { PrismaClient } = require('@prisma/client');
const { MarketDataProviderFactory } = require('./dist/providers/MarketDataProviderFactory');

async function run() {
  const prisma = new PrismaClient();
  const service = new DataIngestionService();
  
  // Just manually do the fetch logic for Sensex so it's fast
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  
  const targetDate1 = new Date('2026-08-09T18:30:00.000Z');
  const targetDate2 = new Date('2026-08-10T18:30:00.000Z');
  
  // Actually, I can just call DataIngestionService.ingestInstrument(inst, targetDate) if it's public.
  // It's private. Let's just run ingestDataForDate, but it will skip all existing ones since they have valid records!
  console.log('Running ingestion...');
  await service.ingestDataForDate(targetDate1);
  await service.ingestDataForDate(targetDate2);
  
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' }
  });
  console.log(`\n--- ${inst.symbol} ---`);
  console.log(`Today Change: ${metric?.todayChange}`);
}
run();
