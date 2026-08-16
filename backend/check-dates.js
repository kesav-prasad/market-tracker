const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const m = await prisma.dailyMetric.findFirst({ orderBy: { date: 'desc' } });
  console.log("Latest metric date in DB:", m.date.toISOString());
}
run();
