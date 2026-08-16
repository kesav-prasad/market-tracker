const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const cas = await prisma.corporateActionFactor.findMany();
  console.log(cas);
}
run();
