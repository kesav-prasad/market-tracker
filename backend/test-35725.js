const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const all = await prisma.dailyMetric.findMany({
    where: { OR: [ { price: { gte: 35720, lte: 35730 } }, { referencePrice: { gte: 35720, lte: 35730 } } ] }
  });
  console.log('DailyMetrics near 35725:', all.map(x => ({ sym: x.instrumentId, date: x.date, price: x.price, ref: x.referencePrice })));
}
run();
