const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
async function run() {
  try {
    const data = await yahooFinance.historical('SENSEXETF.BO', { period1: '2026-08-01', period2: '2026-08-12' });
    console.log('SENSEXETF.BO', data.map(d => ({ date: d.date, close: d.close })));
  } catch (e) { console.log(e.message) }
  try {
    const data = await yahooFinance.historical('SENSEXADD.BO', { period1: '2026-08-01', period2: '2026-08-12' });
    console.log('SENSEXADD.BO', data.map(d => ({ date: d.date, close: d.close })));
  } catch (e) { console.log(e.message) }
}
run();
