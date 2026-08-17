import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { Observation, MarketDataProvider } from './MarketDataProvider';
import { formatInTimeZone } from 'date-fns-tz';

export class YahooFinanceDataProvider implements MarketDataProvider {
  
  private formatSymbol(symbol: string, providerSymbol?: string | null): string {
    if (providerSymbol) {
      if (providerSymbol.startsWith('NSE:')) return `${providerSymbol.replace('NSE:', '')}.NS`;
      if (providerSymbol.startsWith('BSE:')) return `${providerSymbol.replace('BSE:', '')}.BO`;
      return providerSymbol;
    }
    if (!symbol.includes('.')) {
      return `${symbol}.NS`;
    }
    return symbol;
  }

  async getObservation(symbol: string, date: Date, providerSymbol?: string | null): Promise<Observation> {
    const formattedSymbol = this.formatSymbol(symbol, providerSymbol);
    // Yahoo Finance historical expects string dates (YYYY-MM-DD) or Date objects
    // Using explicit Asia/Kolkata formatted strings prevents local server timezone drift
    const period1Str = formatInTimeZone(date, 'Asia/Kolkata', 'yyyy-MM-dd');
    
    // Calculate tomorrow in IST for period2
    const targetDateObj = new Date(date);
    const tomorrowObj = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000);
    const period2Str = formatInTimeZone(tomorrowObj, 'Asia/Kolkata', 'yyyy-MM-dd');
    
    try {
      const chartData: any = await (yahooFinance.chart(formattedSymbol, {
        period1: period1Str,
        period2: period2Str,
      }) as Promise<any>);
      
      const results: any[] = chartData?.quotes || [];

      if (results && results.length > 0) {
        // Yahoo returns dates at 03:45:00 UTC (which is 09:15 IST)
        // Find the result that matches our requested local date
        const result = results.find((r: any) => formatInTimeZone(r.date, 'Asia/Kolkata', 'yyyy-MM-dd') === period1Str);
        
        if (result) {
          return {
            instrumentSymbol: symbol,
            date: date,
            price: result.close,
            source: 'YAHOO_FINANCE',
            status: 'VERIFIED',
            timestamp: new Date()
          };
        }
      }
    } catch (e: any) {
      console.warn(`Yahoo Finance historical data error for ${formattedSymbol} on ${date.toISOString()}:`, e.message);
    }

    // Fallback if missing
    return {
      instrumentSymbol: symbol,
      date: date,
      price: null,
      source: 'YAHOO_FINANCE',
      status: 'MISSING',
      timestamp: new Date()
    };
  }

  async getLatestObservation(symbol: string, providerSymbol?: string | null): Promise<Observation> {
    const formattedSymbol = this.formatSymbol(symbol, providerSymbol);
    
    try {
      const quote: any = await (yahooFinance.quote(formattedSymbol) as Promise<any>);
      
      if (quote && quote.regularMarketPrice) {
        return {
          instrumentSymbol: symbol,
          date: new Date(), // This represents 'now'
          price: quote.regularMarketPrice,
          source: 'YAHOO_FINANCE',
          status: 'PROVISIONAL', // Real-time data is provisional until market close
          timestamp: new Date()
        };
      }
    } catch (e: any) {
      console.warn(`Yahoo Finance quote error for ${formattedSymbol}:`, e.message);
    }

    return {
      instrumentSymbol: symbol,
      date: new Date(),
      price: null,
      source: 'YAHOO_FINANCE',
      status: 'MISSING',
      timestamp: new Date()
    };
  }
}
