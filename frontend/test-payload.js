async function run() {
  const res = await fetch('http://localhost:3001/api/dashboard');
  const json = await res.json();
  const ytdData = json.ytdData;
  const nifty = ytdData['NIFTYBEES'];
  
  if (!nifty) {
    console.error("NIFTYBEES missing from ytdData");
    return;
  }
  
  const trendPayload = nifty.series.flatMap(s => s.observations.map(o => ({
     date: o.date,
     value: o.seriesChange,
     referenceDate: s.referenceDate,
     referencePrice: s.referencePrice
  })));
  
  const flatYtdObservations = nifty.series.flatMap(s => s.observations);
  const ytdPayload = flatYtdObservations.map(o => ({
     date: o.date,
     value: o.ytdChange,
     ytdReferenceDate: '2026-01-01', 
     ytdReferencePrice: 296 
  }));
  
  console.log("TREND (SERIES) CHART PAYLOAD");
  console.log(JSON.stringify(trendPayload, null, 2));
  
  console.log("\nYTD CHART PAYLOAD");
  console.log(JSON.stringify(ytdPayload, null, 2));
}

run();
