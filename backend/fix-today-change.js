const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const today = new Date('2026-08-11T18:30:00.000Z');
  
  const metrics = await prisma.dailyMetric.findMany({
    where: { date: today, todayChange: null }
  });
  
  console.log(`Found ${metrics.length} metrics with null todayChange.`);
  
  for (const m of metrics) {
    const prev = await prisma.dailyMetric.findFirst({
      where: {
        instrumentId: m.instrumentId,
        date: { lt: today },
        price: { not: null }
      },
      orderBy: { date: 'desc' }
    });
    
    if (prev && prev.price && m.price) {
      const todayChange = ((m.price - prev.price) / prev.price) * 100;
      await prisma.dailyMetric.update({
        where: { id: m.id },
        data: { todayChange }
      });
      console.log(`Updated instrument ${m.instrumentId}: ${todayChange.toFixed(2)}%`);
    }
  }
}
fix().catch(console.error).finally(() => prisma.$disconnect());
