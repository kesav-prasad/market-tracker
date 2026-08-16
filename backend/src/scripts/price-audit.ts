import { PrismaClient } from '@prisma/client';
import { format, formatInTimeZone } from 'date-fns-tz';

const prisma = new PrismaClient();

async function run() {
  const symbol = 'NIFTYBEES';
  const inst = await prisma.instrument.findFirst({ where: { symbol } });
  
  if (!inst) throw new Error("Not found");

  const metrics = await prisma.dailyMetric.findMany({
    where: { 
      instrumentId: inst.id,
      date: { gte: new Date('2026-07-28T00:00:00Z') }
    },
    orderBy: { date: 'asc' }
  });

  console.log('--------------------------------------------------');
  console.log('PRICE AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Symbol: ${inst.symbol}`);
  
  // Let's print the last 5 days
  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i-1];
    const curr = metrics[i];
    
    // Simulate what the Google Sheet would have expected (just string dates)
    const expectedSheetChange = curr.todayChange; // We'll just print app change
    
    console.log(`\nMarket Date: ${curr.date.toISOString()} (Local: ${curr.date.toString()})`);
    console.log(`Previous Trading Date: ${prev.date.toISOString()}`);
    console.log(`Previous Close: ${prev.price}`);
    console.log(`Current Price: ${curr.price}`);
    console.log(`Application Daily Change: ${curr.todayChange}%`);
    console.log(`Status: ${curr.status}`);
  }
}

run().finally(() => prisma.$disconnect());
