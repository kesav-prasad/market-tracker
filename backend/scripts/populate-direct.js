const { DataIngestionService } = require('../dist/services/DataIngestionService.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dates = [
  '2026-07-28',
  '2026-07-28',
  '2026-07-29',
  '2026-07-30',
  '2026-07-31',
  '2026-08-01', // Saturday (should fallback to July 31)
  '2026-08-02', // Sunday (should fallback to July 31)
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
  '2026-08-08', // Saturday (should fallback to Aug 7)
];

async function run() {
  const ingestionService = new DataIngestionService();
  for (const d of dates) {
    console.log(`Ingesting for ${d}...`);
    try {
      await ingestionService.ingestDataForDate(new Date(`${d}T00:00:00`));
      console.log(`Success for ${d}`);
    } catch (err) {
      console.error(`Error for ${d}:`, err);
    }
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
