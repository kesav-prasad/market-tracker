import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const data = await (yahooFinance.chart('POWERINDIA.NS', { period1: '2026-07-30', period2: '2026-07-31' }) as Promise<any>);
    console.log(data?.quotes?.length, data?.quotes?.[0]?.close);
  } catch(e: any) {
    console.error('Error with POWERINDIA.NS:', e.message);
  }
}
test();
