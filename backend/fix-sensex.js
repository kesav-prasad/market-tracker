const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.instrument.update({
    where: { symbol: 'SENSEXBETA' },
    data: { providerSymbol: 'SENSEXADD.BO' }
  });
  console.log('Fixed SENSEXBETA providerSymbol');
}
run();
