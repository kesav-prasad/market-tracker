import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const symbols = ['NIFTYBEES', 'SENSEXBETA', 'BANKBEES', 'GOLDBEES', 'SILVERBEES'];
  
  for (const sym of symbols) {
    const pSymbol = sym === 'SENSEXBETA' ? 'SENSEX.BO' : `${sym}.NS`; // Adjusting provider symbols for Yahoo Finance
    // Actually, SENSEXBETA is not standard. NIFTYBEES is NIFTYBEES.NS. Let's just use .NS or .BO
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
