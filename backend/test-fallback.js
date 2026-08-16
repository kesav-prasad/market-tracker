const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateGenericChange(currentPrice, referencePrice) {
    if (currentPrice === null || currentPrice === undefined || referencePrice === 0 || isNaN(referencePrice) || referencePrice == null) {
      return null;
    }
    return ((currentPrice - referencePrice) / referencePrice) * 100;
}

async function run() {
  const lm = await prisma.dailyMetric.findFirst({ where: { instrumentId: 1 }, orderBy: { date: 'desc' } });
  console.log("LM YTD REF:", lm.ytdReferencePrice);
  
  const old = await prisma.dailyMetric.findFirst({ where: { instrumentId: 1 }, orderBy: { date: 'asc' } });
  console.log("OLD PRICE:", old.price, "OLD YTD CHANGE:", old.ytdChange);
  
  let calculated = old.ytdChange;
  if (calculated === null && lm.ytdReferencePrice != null && old.price !== null) {
     calculated = calculateGenericChange(old.price, lm.ytdReferencePrice);
  }
  
  console.log("CALCULATED:", calculated);
}
run();
