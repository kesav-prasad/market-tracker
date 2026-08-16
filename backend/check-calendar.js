process.env.TZ = 'Asia/Kolkata';
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const targetDate = new Date('2026-08-10T18:30:00.000Z'); // August 11 in IST? Wait!
  const targetDate10 = new Date('2026-08-09T18:30:00.000Z'); // August 10 in IST.
  
  console.log("Aug 11 prev:", (await MarketCalendarService.getPreviousTradingSession(targetDate, 1)).toISOString());
  console.log("Aug 10 prev:", (await MarketCalendarService.getPreviousTradingSession(targetDate10, 1)).toISOString());
}
run();
