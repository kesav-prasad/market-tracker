import { MarketDataProvider } from './MarketDataProvider';
import { YahooFinanceDataProvider } from './YahooFinanceDataProvider';
import { MockMarketDataProvider } from './MockMarketDataProvider';

export class MarketDataProviderFactory {
  static getProvider(providerName: string): MarketDataProvider {
    switch (providerName) {
      case 'Yahoo Finance':
      case 'YAHOO_FINANCE':
        return new YahooFinanceDataProvider();
      case 'MOCK_PROVIDER':
      case 'Mock Provider':
        if (process.env.NODE_ENV === 'production') {
          console.warn('WARNING: Mock provider requested in production. This is not recommended.');
        }
        return new MockMarketDataProvider();
      default:
        console.warn(`Unknown provider '${providerName}'. Falling back to YahooFinanceDataProvider.`);
        return new YahooFinanceDataProvider();
    }
  }
}
