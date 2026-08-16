import { formatInTimeZone } from 'date-fns-tz';
import { Observation, MarketDataProvider } from './MarketDataProvider';

/**
 * Mock provider that returns deterministic data for testing
 * based on the "Golden Test Case" rules and simulated market conditions.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  private basePrices: Record<string, number> = {
    'NIFTYBEES': 274,
    'SENSEXBETA': 845,
    'BANKBEES': 588,
    'GOLDBEES': 117,
    'SILVERBEES': 206,
    'POWERINDIA': 150
  };

  private jan1Prices: Record<string, number> = {
    'NIFTYBEES': 296,
    'SENSEXBETA': 938,
    'BANKBEES': 615,
    'GOLDBEES': 111,
    'SILVERBEES': 235,
    'POWERINDIA': 150
  };

  private dailyMultipliers: Record<string, number[]> = {
    '2026-07-28': [1.000, 1.000, 1.000, 1.000, 1.000],
    '2026-07-29': [1.007, 1.009, 1.004, 1.016, 1.018],
    '2026-07-30': [1.009, 1.012, 1.006, 1.021, 1.024],
    '2026-07-31': [1.009, 1.002, 0.990, 1.018, 1.016],
    '2026-08-03': [1.022, 1.026, 1.014, 1.032, 1.038], 
    '2026-08-04': [1.018, 1.021, 1.011, 1.027, 1.032],
    '2026-08-05': [1.023, 1.027, 1.017, 1.041, 1.052],
    '2026-08-06': [1.025, 1.029, 1.019, 1.046, 1.061],
    '2026-08-07': [1.0219, 1.0296, 1.0187, 1.0513, 1.068],
  };

  // Percentage changes from Jan 1st (as shown in the user's spreadsheet)
  // [NIFTYBEES, SENSEXBETA, BANKBEES, GOLDBEES, SILVERBEES]
  private historicalExpiriesPct: Record<string, number[]> = {
    '2026-01-01': [0, 0, 0, 15.8, 26.1],
    '2026-01-27': [0, 0, 2.5, 18.3, 6.8],
    '2026-02-24': [-2.7, 0, -15.3, 9.4, -7.9],
    '2026-03-30': [-13.8, -9.9, -6.8, 10.4, -4.1],
    '2026-04-28': [-8.2, -10.4, -7.1, 16.9, 7.0],
    '2026-05-26': [-8.4, -9.9, -2.8, 4.5, -9.3],
    '2026-06-30': [-8.0, -9.6, -4.4, 5.1, -12.2],
  };

  async getObservation(symbol: string, date: Date, providerSymbol?: string | null): Promise<Observation> {
    const dateStr = formatInTimeZone(date, 'Asia/Kolkata', 'yyyy-MM-dd');
    const base = this.basePrices[symbol];
    const jan1Base = this.jan1Prices[symbol];
    
    let price: number | null = null;
    let status = 'MOCK';

    const indexMap: Record<string, number> = {
      'NIFTYBEES': 0,
      'SENSEXBETA': 1,
      'BANKBEES': 2,
      'GOLDBEES': 3,
      'SILVERBEES': 4,
      'POWERINDIA': 5
    };

    const symIndex = indexMap[symbol];
    
    if (dateStr === '2026-01-01' || dateStr === '2026-01-02') {
      price = jan1Base;
    } else if (this.historicalExpiriesPct[dateStr] && symIndex !== undefined) {
      // Calculate price based on percentage change from Jan 1
      const pctChange = this.historicalExpiriesPct[dateStr][symIndex] ?? 0;
      price = jan1Base * (1 + (pctChange / 100));
    } else if (this.dailyMultipliers[dateStr] && symIndex !== undefined) {
      const multiplier = this.dailyMultipliers[dateStr][symIndex] ?? 1.0;
      price = base * multiplier;
    } else if (date < new Date('2026-07-28T00:00:00')) {
      const daysDiff = (new Date('2026-07-28T00:00:00').getTime() - date.getTime()) / (1000 * 3600 * 24);
      const trend = 1 - (daysDiff * 0.0005); // General uptrend leading to July 28
      const wave = Math.sin(daysDiff * 0.2) * 0.015; // +/- 1.5% wave for volatility
      price = base * (trend + wave);
    } else {
       // fallback for unknown dates for known symbols, or MISSING for unknown symbols
       if (symIndex !== undefined) {
         const day = date.getDate();
         price = base + (day * 0.1);
       } else {
         price = null;
         status = 'MISSING';
       }
    }

    return {
      instrumentSymbol: symbol,
      date,
      price,
      source: 'MOCK_PROVIDER',
      status,
      timestamp: new Date()
    };
  }

  async getLatestObservation(symbol: string, providerSymbol?: string | null): Promise<Observation> {
    return this.getObservation(symbol, new Date(), providerSymbol);
  }
}
