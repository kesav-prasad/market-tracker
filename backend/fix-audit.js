const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixData() {
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      previousClosePrice: null,
      todayChange: { not: null },
      price: { not: null }
    }
  });

  console.log(`Found ${metrics.length} records to fix`);
  
  let fixedCount = 0;
  for (const m of metrics) {
    if (m.price !== null && m.todayChange !== null) {
      const C = m.todayChange / 100;
      const prevClose = m.price / (C + 1);
      
      await prisma.dailyMetric.update({
        where: { id: m.id },
        data: { previousClosePrice: prevClose }
      });
      fixedCount++;
    }
  }
  console.log(`Fixed ${fixedCount} records`);
}

fixData().catch(console.error).finally(() => prisma.$disconnect());
