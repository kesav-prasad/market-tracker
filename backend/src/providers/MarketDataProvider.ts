export interface Observation {
  instrumentSymbol: string;
  date: Date;
  price: number | null;
  source: string;
  status: string; // VERIFIED, PROVISIONAL, STALE, MISSING, INVALID
  timestamp: Date;
}

export interface MarketDataProvider {
  getObservation(symbol: string, date: Date, providerSymbol?: string | null): Promise<Observation>;
  getLatestObservation(symbol: string, providerSymbol?: string | null): Promise<Observation>;
}
