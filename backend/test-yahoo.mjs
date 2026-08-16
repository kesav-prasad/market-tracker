import yahooFinance from 'yahoo-finance2';

async function run() {
  try {
     const yf = yahooFinance.default ? yahooFinance.default : yahooFinance;
     const chart = await yf.chart('NIFTYBEES.NS', { period1: '2026-01-01', period2: '2026-08-10', interval: '1d' });
     console.log("SUCCESS:", chart.quotes.length);
  } catch(e) {
     console.error(e.message);
  }
}
run();
