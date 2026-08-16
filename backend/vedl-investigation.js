const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  const symbol = 'VEDL.NS';
  const period1 = '2026-01-01';
  const period2 = '2026-08-11';

  try {
    const chartData = await yahooFinance.chart(symbol, {
      period1,
      period2,
    });
    
    const quotes = chartData.quotes || [];
    if (quotes.length > 0) {
      const firstValidDay = quotes[0];
      const currentDay = quotes[quotes.length - 1];
      
      console.log('VEDL FORENSIC AUDIT\n');
      console.log(`FIRST VALID TRADING DATE OF 2026: ${firstValidDay.date.toISOString().split('T')[0]}`);
      console.log(`YEAR START RAW CLOSE: ₹${firstValidDay.close}`);
      console.log(`YEAR START ADJUSTED CLOSE: ₹${firstValidDay.adjclose}`);
      console.log(`CURRENT DATE: ${currentDay.date.toISOString().split('T')[0]}`);
      console.log(`CURRENT RAW PRICE: ₹${currentDay.close}`);
      console.log(`CURRENT ADJUSTED PRICE: ₹${currentDay.adjclose}`);
      
      const unadjYtd = ((currentDay.close - firstValidDay.close) / firstValidDay.close) * 100;
      const adjYtd = ((currentDay.close - firstValidDay.adjclose) / firstValidDay.adjclose) * 100;
      const bothAdjYtd = ((currentDay.adjclose - firstValidDay.adjclose) / firstValidDay.adjclose) * 100;
      
      console.log(`\nAPPLICATION YTD (Unadjusted Start vs Unadjusted Current): ${unadjYtd.toFixed(2)}%`);
      console.log(`MIXED YTD (Adjusted Start vs Unadjusted Current): ${adjYtd.toFixed(2)}%`);
      console.log(`TRUE ADJUSTED YTD (Adjusted Start vs Adjusted Current): ${bothAdjYtd.toFixed(2)}%`);
    } else {
      console.log("No quotes found.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
