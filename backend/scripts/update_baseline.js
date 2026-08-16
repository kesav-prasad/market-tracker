const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const symbols = ['NIFTYBEES', 'SENSEXBETA', 'BANKBEES', 'GOLDBEES', 'SILVERBEES'];
  
  for (const sym of symbols) {
    const actualPSymbol = sym === 'SENSEXBETA' ? 'SENSEXBETA.BO' : `${sym}.NS`;
    
    await prisma.instrument.update({
      where: { symbol: sym },
      data: {
        provider: 'Yahoo Finance',
        providerSymbol: actualPSymbol
      }
    });
    console.log(`Updated ${sym} to Yahoo Finance with symbol ${actualPSymbol}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
