const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrument: { symbol: 'VEDL' } },
    orderBy: { date: 'desc' }
  });
  if (metric) {
    console.log(`Date: ${metric.date}`);
    console.log(`Current Price: ${metric.price}`);
    console.log(`YTD Reference Price: ${metric.ytdReferencePrice}`);
    console.log(`YTD Change: ${metric.ytdChange}%`);
  } else {
    console.log('No metrics found yet. Try again.');
  }
}
run();
