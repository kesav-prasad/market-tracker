const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  const service = new DataIngestionService();
  
  console.log("Ingesting for August 10...");
  await service.ingestDataForDate(new Date('2026-08-09T18:30:00.000Z'));
  
  console.log("Ingesting for August 11...");
  await service.ingestDataForDate(new Date('2026-08-10T18:30:00.000Z'));
  
  console.log("\nIngestion complete. Re-checking metrics...");
  
  const instruments = await prisma.instrument.findMany({
    where: { symbol: { in: ['NIFTYBEES', 'SENSEXBETA', 'SONACOMS'] } }
  });
  
  for (const inst of instruments) {
    const metric = await prisma.dailyMetric.findFirst({
      where: { instrumentId: inst.id },
      orderBy: { date: 'desc' }
    });
    console.log(`\n--- ${inst.symbol} ---`);
    console.log(`Today Change: ${metric?.todayChange}`);
  }
}
run();
