import { SeriesEngine } from '../services/SeriesEngine';

async function test() {
  const today = new Date('2026-08-13T10:00:00Z');
  const currentSeries = await SeriesEngine.getCurrentSeries(today);
  console.log('Current Series boundaries (for ' + today.toISOString() + '):');
  console.log('Reference Date (Previous Expiry Close):', new Date(currentSeries.referenceDate.getTime() + 5.5*3600000).toISOString().substring(0,10));
  console.log('Expected Expiry Date:', new Date(currentSeries.expectedExpiryDate.getTime() + 5.5*3600000).toISOString().substring(0,10));

  const nextMonth = new Date('2026-08-28T10:00:00Z');
  const nextSeries = await SeriesEngine.getCurrentSeries(nextMonth);
  console.log('\nNext Series boundaries (for ' + nextMonth.toISOString() + '):');
  console.log('Reference Date (Previous Expiry Close):', new Date(nextSeries.referenceDate.getTime() + 5.5*3600000).toISOString().substring(0,10));
  console.log('Expected Expiry Date:', new Date(nextSeries.expectedExpiryDate.getTime() + 5.5*3600000).toISOString().substring(0,10));
}

test().catch(console.error);
