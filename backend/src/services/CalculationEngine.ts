import { MarketCalendarService } from './MarketCalendarService';

export class CalculationEngine {
  /**
   * Calculate Today Change %
   * Formula: ((Current Price - Previous Trading Close) / Previous Trading Close) * 100
   */
  static calculateTodayChange(currentPrice: number | null, previousClose: number | null): number | null {
    if (currentPrice === null || currentPrice === undefined || previousClose === 0 || isNaN(previousClose!) || previousClose == null) {
      return null;
    }
    return ((currentPrice - previousClose) / previousClose) * 100;
  }

  /**
   * Calculate Series Change %
   * Formula: ((Current Price - Series Reference Price) / Series Reference Price) * 100
   */
  static calculateSeriesChange(currentPrice: number | null, referencePrice: number | null): number | null {
    return this.calculateGenericChange(currentPrice, referencePrice);
  }

  static calculateGenericChange(currentPrice: number | null, referencePrice: number | null): number | null {
    if (currentPrice === null || currentPrice === undefined || referencePrice === 0 || isNaN(referencePrice!) || referencePrice == null) {
      return null;
    }
    return ((currentPrice - referencePrice) / referencePrice) * 100;
  }

  static calculateYtdChange(currentPrice: number | null, ytdReferencePrice: number | null): number | null {
    return this.calculateGenericChange(currentPrice, ytdReferencePrice);
  }
}
