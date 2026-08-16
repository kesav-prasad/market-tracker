const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const targetDate = new Date('2026-08-11T18:30:00.000Z'); // August 11, but wait, August 11 18:30 UTC is August 12 00:00 IST!
  const prevDate = await MarketCalendarService.getPreviousTradingSession(targetDate, 1);
  console.log("Target Date:", targetDate.toISOString());
  console.log("Previous Trading Session:", prevDate.toISOString());
}
run();
