const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const targetDate = new Date('2026-08-09T18:30:00.000Z'); // August 10 00:00 IST (Monday)
  const prevDate = await MarketCalendarService.getPreviousTradingSession(targetDate, 1);
  console.log("Target Date (IST Mon):", targetDate.toISOString());
  console.log("Previous Trading Session:", prevDate.toISOString());
}
run();
