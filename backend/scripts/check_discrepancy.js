const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.discrepancy.findMany({
    include: { priceObservation: { include: { instrument: true } } }
  });
  d.forEach(r => {
    console.log(`${r.priceObservation.instrument.symbol}: old ${r.oldValue} -> new ${r.newValue}`);
  });
}

main().finally(() => prisma.$disconnect());
