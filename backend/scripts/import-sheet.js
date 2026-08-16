const snapshots = [
  {
    marketDate: '2026-07-28',
    instrumentSymbol: 'NIFTYBEES',
    referencePrice: 274,
    currentPrice: 274,
    previousClose: null,
    todayChange: null,
    seriesChange: 0
  },
  {
    marketDate: '2026-08-07',
    instrumentSymbol: 'NIFTYBEES',
    referencePrice: 274,
    currentPrice: 280,
    previousClose: 280.84, // Approximate to make today change -0.3%
    todayChange: -0.3,
    seriesChange: 2.18978
  },
  {
    marketDate: '2026-08-07',
    instrumentSymbol: 'SENSEXBETA',
    referencePrice: 845,
    currentPrice: 870,
    previousClose: 863.09,
    todayChange: 0.8,
    seriesChange: 2.95858
  },
  {
    marketDate: '2026-08-07',
    instrumentSymbol: 'BANKBEES',
    referencePrice: 588,
    currentPrice: 599,
    previousClose: 600.2,
    todayChange: -0.2,
    seriesChange: 1.87075
  },
  {
    marketDate: '2026-08-07',
    instrumentSymbol: 'GOLDBEES',
    referencePrice: 117,
    currentPrice: 123,
    previousClose: 122.145,
    todayChange: 0.7,
    seriesChange: 5.12821
  },
  {
    marketDate: '2026-08-07',
    instrumentSymbol: 'SILVERBEES',
    referencePrice: 206,
    currentPrice: 220,
    previousClose: 214.21,
    todayChange: 2.703,
    seriesChange: 6.79612
  }
];

async function run() {
  console.log('Sending mock Google Sheet snapshot for reconciliation...');
  
  const res = await fetch('http://localhost:3001/api/reconcile/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshots })
  });

  const data = await res.json();
  console.log('Response:', data);
}

run();
