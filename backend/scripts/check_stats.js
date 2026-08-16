const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestMetric = await prisma.dailyMetric.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  console.log("Latest metric updatedAt:", latestMetric?.updatedAt, "date:", latestMetric?.date);
  
  if (latestMetric) {
    const metrics = await prisma.dailyMetric.findMany({
      where: { date: latestMetric.date },
      include: { instrument: true }
    });
    
    console.log(`Found ${metrics.length} metrics for date: ${latestMetric.date}`);
    const grouped = metrics.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});
    console.log(grouped);
    
    const yf = metrics.filter(m => ['NIFTYBEES', 'SENSEXBETA', 'BANKBEES', 'GOLDBEES', 'SILVERBEES'].includes(m.instrument.symbol));
    console.log("5 Baseline Instruments:");
    yf.forEach(m => console.log(`${m.instrument.symbol}: ${m.price} [${m.status}] Ref: ${m.referencePrice} YTD Ref: ${m.ytdReferencePrice}`));
  }
}

main().finally(() => prisma.$disconnect());
