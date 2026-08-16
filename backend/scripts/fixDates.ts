import prisma from '../src/db';
import { startOfDay } from 'date-fns';
async function main() {
  const obs = await prisma.priceObservation.findMany({ where: { source: 'EXCEL' } });
  let count = 0;
  for (const o of obs) {
    const start = startOfDay(o.date);
    if (start.getTime() !== o.date.getTime()) {
      await prisma.priceObservation.update({
        where: { id: o.id },
        data: { date: start }
      });
      count++;
    }
  }
  console.log('Fixed', count, 'PriceObservation dates');
}
main().catch(console.error);
