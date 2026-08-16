const { YahooFinanceProvider } = require('./dist/services/YahooFinanceProvider');
async function main() {
  const provider = new YahooFinanceProvider();
  const res = await provider.getObservation('NIFTYBEES', new Date('2026-08-11T00:00:00.000Z'), 'NIFTYBEES.NS');
  console.log(res);
}
main();
