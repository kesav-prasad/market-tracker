import yahooFinance from 'yahoo-finance2';

async function checkSymbol(sym) {
  try {
    const res = await yahooFinance.quote(sym);
    console.log(`[SUCCESS] ${sym} -> price: ${res.regularMarketPrice}`);
  } catch (e) {
    console.log(`[ERROR] ${sym} -> ${e.message}`);
  }
}

async function run() {
  await checkSymbol('NIFTYBEES.NS');
  await checkSymbol('NIFTYBEES.BO');
  await checkSymbol('RELIANCE.NS'); // verify network works
}

run();
