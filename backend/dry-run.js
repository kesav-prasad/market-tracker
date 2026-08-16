import { SeriesEngine } from './src/services/SeriesEngine';
async function test() {
    const today = new Date('2026-08-13T10:00:00Z');
    const currentSeries = await SeriesEngine.getCurrentSeries(today);
    console.log('Current Series boundaries (for ' + today.toISOString() + '):');
    console.log('Reference Date (Previous Expiry Close):', currentSeries.referenceDate.toISOString().substring(0, 10));
    console.log('Expected Expiry Date:', currentSeries.expectedExpiryDate.toISOString().substring(0, 10));
    const nextMonth = new Date('2026-08-28T10:00:00Z'); // just past Aug expiry (Aug 27)
    const nextSeries = await SeriesEngine.getCurrentSeries(nextMonth);
    console.log('\nNext Series boundaries (for ' + nextMonth.toISOString() + '):');
    console.log('Reference Date (Previous Expiry Close):', nextSeries.referenceDate.toISOString().substring(0, 10));
    console.log('Expected Expiry Date:', nextSeries.expectedExpiryDate.toISOString().substring(0, 10));
}
test().catch(console.error);
