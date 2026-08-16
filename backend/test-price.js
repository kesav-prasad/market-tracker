const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.priceObservation.findFirst({ where: { price: { gte: 35724, lte: 35726 } } });
  console.log(p);
}
run();
