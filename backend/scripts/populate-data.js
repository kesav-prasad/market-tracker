const dates = [
  '2026-07-28',
  '2026-07-28',
  '2026-07-29',
  '2026-07-30',
  '2026-07-31',
  '2026-08-01', // Saturday (should fallback to July 31)
  '2026-08-02', // Sunday (should fallback to July 31)
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
  '2026-08-08', // Saturday (should fallback to Aug 7)
];

async function run() {
  for (const d of dates) {
    console.log(`Triggering refresh for ${d}...`);
    const res = await fetch('http://localhost:3001/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: d })
    });
    const data = await res.json();
    console.log(data);
  }
}

run();
