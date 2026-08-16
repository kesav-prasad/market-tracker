const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const series = await prisma.series.findFirst({
    where: { isFinalized: false }
  });
  console.log('Active Series:', series);
}
run();
