const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'POWERINDIA' } });
  
  if (!inst) {
    console.log("POWERINDIA not found");
    return;
  }

  const latestMetric = await prisma.dailyMetric.findFirst({
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' }
  });

  if (!latestMetric) {
    console.log("No metrics found");
    return;
  }

  console.log(`Instrument: ${inst.symbol}`);
  console.log(`Date: ${new Date(latestMetric.date).toISOString().split('T')[0]}`);
  console.log(`Current Price: ₹${latestMetric.price}`);
  console.log(`\n--- STANDARD / YTD ---`);
  console.log(`January Reference: ₹${latestMetric.ytdReferencePrice}`);
  console.log(`YTD Change: ${latestMetric.ytdChange}%`);

  console.log(`\n--- TREND (SERIES) ---`);
  console.log(`Current Series Reference: ₹${latestMetric.referencePrice}`);
  console.log(`Series Change: ${latestMetric.seriesChange}%`);
  
  if (latestMetric.ytdReferencePrice !== latestMetric.referencePrice && latestMetric.ytdChange !== latestMetric.seriesChange) {
    console.log("\nPASS — References and percentage changes are different after an expiry.");
  } else {
    console.log("\nFAIL — Both references are identical or missing.");
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
