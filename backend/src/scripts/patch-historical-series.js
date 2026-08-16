const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Patching historical series into monthly chunks...');
  
  const instruments = await prisma.instrument.findMany({ where: { isActive: true } });
  
  // Create Series for each month from Jan to Jul
  const monthlySeries = {};
  for (let month = 0; month <= 6; month++) {
    const refDate = new Date(Date.UTC(2026, month, 1, 0, 0, 0));
    const expDate = new Date(Date.UTC(2026, month + 1, 0, 23, 59, 59));
    
    let series = await prisma.series.findFirst({
      where: { referenceDate: refDate }
    });
    
    if (!series) {
      series = await prisma.series.create({
        data: {
          referenceDate: refDate,
          expectedExpiryDate: expDate,
          isFinalized: true
        }
      });
    }
    monthlySeries[month] = series.id;
  }
  
  for (const inst of instruments) {
    const metrics = await prisma.dailyMetric.findMany({
      where: { instrumentId: inst.id, date: { lt: new Date('2026-07-28T00:00:00Z') } },
      orderBy: { date: 'asc' }
    });
    
    // Group by month
    const byMonth = {};
    for (const m of metrics) {
      const month = m.date.getMonth(); // 0 to 6
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(m);
    }
    
    for (let month = 0; month <= 6; month++) {
      const monthMetrics = byMonth[month];
      if (!monthMetrics || monthMetrics.length === 0) continue;
      
      const seriesId = monthlySeries[month];
      const refPrice = monthMetrics[0].price;
      
      for (let i = 0; i < monthMetrics.length; i++) {
        const m = monthMetrics[i];
        let seriesChange = null;
        if (m.price !== null && refPrice !== null && refPrice !== 0) {
          seriesChange = ((m.price - refPrice) / refPrice) * 100;
        }
        
        await prisma.dailyMetric.update({
          where: { id: m.id },
          data: {
            seriesId: seriesId,
            seriesChange: seriesChange
          }
        });
      }
    }
  }
  
  console.log('Patch complete!');
}

run().finally(() => prisma.$disconnect());
