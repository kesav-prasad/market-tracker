import prisma from './src/db';
import { DataIngestionService } from './src/services/DataIngestionService';

async function testFinalization() {
  const svc = new DataIngestionService();
  
  // Try to ingest for August 28th, 2026 (which is well past the July 28th expiry)
  // This should force DataIngestionService to notice the current series (July 27 - Aug 25) is unfinalized
  // BUT the July 27 series expectedExpiry is Aug 25th.
  
  // Let's manually backdate the DB to pretend we're on July 28th attempting to ingest July 29th.
  try {
    await svc.ingestDataForDate(new Date('2026-08-26T18:30:00.000Z')); // Aug 27th IST (Next series starts Aug 26th)
  } catch (e: any) {
    console.error('Expected Error (because we skipped a month of data and validation fails):');
    console.error(e.message);
  }
}

testFinalization().then(() => process.exit(0));
