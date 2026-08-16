const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const series = await prisma.series.findMany();
  console.log(series);
}
run().catch(console.error).finally(() => prisma.$disconnect());
