const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const mocks = await prisma.instrument.findMany({ where: { provider: 'MOCK_PROVIDER' } });
  console.log('MOCK_PROVIDER instruments:', mocks.map(m => m.symbol));
}
run();
