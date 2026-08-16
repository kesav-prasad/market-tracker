const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const n = await prisma.instrument.findUnique({ where: { symbol: 'NIFTYBEES' } });
  const s = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  console.log('NIFTYBEES provider:', n.provider);
  console.log('SENSEXBETA provider:', s.provider);
}
run();
