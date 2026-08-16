const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const metrics = await prisma.dailyMetric.findMany({
    include: { instrument: true }
  });
  console.log(`Total metrics: ${metrics.length}`);
  if (metrics.length > 0) {
    console.log("First metric:");
    console.log(metrics[0]);
  }
}

main().finally(() => prisma.$disconnect());
