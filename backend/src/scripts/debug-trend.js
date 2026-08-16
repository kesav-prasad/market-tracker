const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  
  const metrics = await prisma.dailyMetric.findMany({
    where: { instrumentId: inst.id },
    orderBy: { date: 'asc' },
    include: { series: true }
  });
  
  console.log("TREND SERIES DEBUG");
  console.log("date | price | series reference date | series reference price | series %");
  
  let currentSeriesId = null;
  let linesPrinted = 0;
  
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    
    if (m.seriesId !== currentSeriesId) {
      if (currentSeriesId !== null) console.log("... expiry ... new series reference ...");
      currentSeriesId = m.seriesId;
      linesPrinted = 0;
    }
    
    if (linesPrinted < 3 || i === metrics.length - 1) {
      console.log(`${m.date.toISOString().substring(0, 10)} | ${m.price} | ${m.series.referenceDate.toISOString().substring(0, 10)} | REF_PRICE | ${m.seriesChange}%`);
    } else if (linesPrinted === 3) {
      console.log("...");
    }
    linesPrinted++;
  }
}
run().finally(() => prisma.$disconnect());
