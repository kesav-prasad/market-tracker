import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
  const data = await (yahooFinance.chart('POWERINDIA.NS', { period1: '2026-07-28', period2: '2026-08-12' }) as Promise<any>);
  console.log(data?.quotes?.map((q: any) => q.date));
}
test();
