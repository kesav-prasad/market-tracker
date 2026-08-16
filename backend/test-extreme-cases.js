const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  const symbols = ['VEDL.NS', 'NIFTYBEES.NS', 'SENSEXBETA.NS', 'BANKBEES.NS', 'GOLDBEES.NS', 'SILVERBEES.NS'];
  const period1 = '2026-01-01';
  const period2 = '2026-08-11';

  console.log("============================================================");
  console.log("EXTREME CASES YTD AUDIT");
  console.log("============================================================\n");

  for (const symbol of symbols) {
    try {
      const chartData = await yahooFinance.chart(symbol, { period1, period2 });
      const quotes = chartData.quotes.filter(q => q.close !== null) || [];
      if (quotes.length > 0) {
        const firstValidDay = quotes[0];
        const currentDay = quotes[quotes.length - 1];
        
        const unadjYtd = ((currentDay.close - firstValidDay.close) / firstValidDay.close) * 100;
        const adjYtd = ((currentDay.close - firstValidDay.adjclose) / firstValidDay.adjclose) * 100;
        
        console.log(`SYMBOL: ${symbol.replace('.NS', '')}`);
        console.log(`YTD Reference Date: ${firstValidDay.date.toISOString().split('T')[0]}`);
        console.log(`YTD Reference Price (Raw): ₹${firstValidDay.close.toFixed(2)}`);
        console.log(`YTD Reference Price (Adjusted): ₹${firstValidDay.adjclose.toFixed(2)}`);
        console.log(`Current Price (Raw): ₹${currentDay.close.toFixed(2)}`);
        console.log(`Calculated YTD (Raw vs Raw): ${unadjYtd.toFixed(2)}%`);
        console.log(`Calculated YTD (Adj vs Adj): ${adjYtd.toFixed(2)}%\n`);
      }
    } catch (error) {
      console.log(`Error fetching ${symbol}:`, error.message, '\n');
    }
  }
}

run();
