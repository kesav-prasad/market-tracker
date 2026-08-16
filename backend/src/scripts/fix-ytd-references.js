const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Patching YTD Reference Prices for all active metrics...');
  const instruments = await prisma.instrument.findMany({ where: { isActive: true } });
  
  const currentYear = 2026;
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00Z`);

  for (const inst of instruments) {
    // Get true YTD reference
    const ytdObs = await prisma.priceObservation.findFirst({
      where: {
        instrumentId: inst.id,
        date: { gte: startOfYear },
        price: { gt: 0 }
      },
      orderBy: { date: 'asc' }
    });
    
    if (!ytdObs) continue;
    
    const trueYtdRefPrice = ytdObs.price;
    const trueYtdRefDate = ytdObs.date;

    const metricsToFix = await prisma.dailyMetric.findMany({
      where: { instrumentId: inst.id }
    });
    
    for (const m of metricsToFix) {
      // Calculate true YTD
      if (m.price !== null) {
        const trueYtdChange = ((m.price - trueYtdRefPrice) / trueYtdRefPrice) * 100;
        await prisma.dailyMetric.update({
          where: { id: m.id },
          data: {
            ytdReferenceDate: trueYtdRefDate,
            ytdReferencePrice: trueYtdRefPrice,
            ytdChange: trueYtdChange
          }
        });
      }
    }
  }
  console.log('Fixed all YTD references!');
}
run().finally(() => prisma.$disconnect());
