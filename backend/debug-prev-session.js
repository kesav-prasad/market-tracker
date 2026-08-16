process.env.TZ = 'Asia/Kolkata';
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const targetDate = new Date('2026-07-28T18:30:00.000Z');
  const prevSessionDate = await MarketCalendarService.getPreviousTradingSession(targetDate, 1);
  console.log('Target:', targetDate.toISOString());
  console.log('Prev:', prevSessionDate.toISOString());
}
run();
