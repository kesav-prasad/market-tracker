process.env.TZ = 'Asia/Kolkata';
const { MockMarketDataProvider } = require('./dist/providers/MockMarketDataProvider');
const provider = new MockMarketDataProvider();
provider.getObservation('SENSEXBETA', new Date('2026-07-27T18:30:00.000Z')).then(console.log);
