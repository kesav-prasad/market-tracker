import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log("=========================================");
  console.log("   BEES INDEX ETF DATA REGRESSION TEST   ");
  console.log("=========================================\n");

  const symbols = ['NIFTYBEES', 'SENSEXBETA', 'BANKBEES', 'GOLDBEES', 'SILVERBEES'];
  let passed = true;

  for (const sym of symbols) {
    try {
      console.log(`Verifying: ${sym}...`);
      const inst = await prisma.instrument.findFirst({ where: { symbol: sym } });
      
      if (!inst) {
        throw new Error(`Symbol ${sym} not found in database.`);
      }

      if (!inst.providerSymbol) {
         throw new Error(`Missing providerSymbol mapping for ${sym}`);
      }

      console.log(`  - Provider Mapping: ${inst.providerSymbol}`);

      const metrics = await prisma.dailyMetric.findMany({
        where: { instrumentId: inst.id },
        orderBy: { date: 'asc' }
      });

      if (metrics.length === 0) {
        throw new Error(`No historical data rows found for ${sym}. Data ingestion failed or is missing.`);
      }

      console.log(`  - Historical Rows: ${metrics.length}`);

      const latestMetric = metrics[metrics.length - 1];
      
      if (!latestMetric.price || latestMetric.price <= 0) {
        throw new Error(`Current price missing or invalid: ${latestMetric.price}`);
      }

      if (!latestMetric.referencePrice) {
        throw new Error(`Series reference price missing.`);
      }

      if (!latestMetric.ytdReferencePrice) {
        throw new Error(`YTD reference price missing.`);
      }

      if (latestMetric.seriesChange == null || isNaN(latestMetric.seriesChange)) {
        throw new Error(`Series change calculation failed: ${latestMetric.seriesChange}`);
      }

      if (latestMetric.ytdChange == null || isNaN(latestMetric.ytdChange)) {
        throw new Error(`YTD change calculation failed: ${latestMetric.ytdChange}`);
      }

      console.log(`  - Latest Price: ₹${latestMetric.price}`);
      console.log(`  - Trend (Series) Change: ${latestMetric.seriesChange}%`);
      console.log(`  - Standard / YTD Change: ${latestMetric.ytdChange}%`);
      console.log(`  -> [PASS] Data integrity verified.\n`);

    } catch (e: any) {
      console.error(`  -> [FAIL] ${e.message}\n`);
      passed = false;
    }
  }

  if (passed) {
    console.log("=========================================");
    console.log("   TEST PASSED - NO MISSING DATA FOUND   ");
    console.log("=========================================");
    process.exit(0);
  } else {
    console.error("=========================================");
    console.error("   TEST FAILED - REGRESSION DETECTED     ");
    console.error("=========================================");
    process.exit(1);
  }
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
