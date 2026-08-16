import { YahooFinanceDataProvider } from '../providers/YahooFinanceDataProvider';

async function run() {
  const provider = new YahooFinanceDataProvider();
  
  const jan1 = new Date('2026-01-01T12:00:00Z');
  try {
     const obs = await provider.getObservation('NIFTYBEES', jan1, 'NIFTYBEES.NS');
     console.log("JAN 1 OBS:", obs);
  } catch(e) {
     console.error(e);
  }
}
run();
