const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'RELIANCE' } });
  
  // Insert a future CA
  const ca = await prisma.corporateActionFactor.create({
    data: {
      instrumentId: inst.id,
      date: new Date('2026-10-01T00:00:00Z'),
      adjustmentFactor: 0.5,
      reason: 'Future Split'
    }
  });

  const { DataIngestionService } = require('./dist/services/DataIngestionService');
  const service = new DataIngestionService();
  
  // Target date is today
  const targetDate = new Date('2026-08-11T18:30:00.000Z');
  
  // Mock console log to intercept the metrics before they save
  console.log("Ingesting for August 12...");
  await service.ingestDataForDate(targetDate);
  
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrumentId: inst.id, date: targetDate }
  });
  
  console.log(`RELIANCE Session Change: ${metric.todayChange}`);
  
  // Clean up
  await prisma.corporateActionFactor.delete({ where: { id: ca.id } });
}
run();
