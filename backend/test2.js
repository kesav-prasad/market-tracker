const { MarketCalendarService } = require('./dist/services/MarketCalendarService');
async function main() {
  const d = new Date('2026-08-11T18:30:00.000Z');
  const prev = await MarketCalendarService.getPreviousTradingSession(d, 1);
  console.log("Prev:", prev);
}
main();
