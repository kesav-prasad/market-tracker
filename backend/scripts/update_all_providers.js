const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.instrument.updateMany({
    where: { isActive: true },
    data: { provider: 'Yahoo Finance' }
  });
  console.log("Updated all instruments to Yahoo Finance.");
}

main().finally(() => prisma.$disconnect());
