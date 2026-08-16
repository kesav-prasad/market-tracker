const matrix = {
  dates: [
    "2026-07-28",
    "2026-07-29",
    "2026-07-30",
    "2026-07-31",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07"
  ],
  rows: {
    NIFTYBEES: {
      data: {
        "2026-07-28": { seriesChange: 0.5 },
        "2026-07-29": { seriesChange: 0.7 },
        "2026-07-30": { seriesChange: 0.9 },
        "2026-07-31": { seriesChange: null },
        "2026-08-03": { seriesChange: 2.2 },
        "2026-08-04": { seriesChange: 1.8 },
        "2026-08-05": { seriesChange: 2.3 },
        "2026-08-06": { seriesChange: 2.4 },
        "2026-08-07": { seriesChange: 2.2 }
      }
    }
  }
};
const matrixRow = matrix.rows.NIFTYBEES;
const seriesChartData = matrixRow ? matrix.dates.map((d) => ({
  date: d,
  seriesChange: matrixRow.data[d]?.seriesChange ?? null
})) : [];
console.log(seriesChartData);
