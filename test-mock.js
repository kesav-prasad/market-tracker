const { MockMarketDataProvider } = require('./backend/dist/providers/MockMarketDataProvider.js');
const mock = new MockMarketDataProvider();
mock.getObservation('SENSEXBETA', new Date('2026-07-28')).then(obs => console.log(obs));
