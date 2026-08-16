const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.instrument.updateMany({
    where: { provider: 'MOCK_PROVIDER' },
    data: { provider: 'YAHOO_FINANCE' }
  });
  console.log('Updated instruments to YAHOO_FINANCE:', result.count);
}
run();
