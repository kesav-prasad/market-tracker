import { Observation } from '../providers/MarketDataProvider';

export class ValidationEngine {
  /**
   * Validates a market observation based on strict business rules.
   * Returns a validated status string and an optional reason for failure.
   */
  static validateObservation(observation: Observation, previousClosePrice: number | null): { status: string; reason?: string } {
    const { price } = observation;

    if (price === null || price === undefined) {
      return { status: 'MISSING', reason: 'Price is null or missing' };
    }

    if (isNaN(price)) {
      return { status: 'INVALID', reason: 'Price is not a number' };
    }

    if (price < 0) {
      return { status: 'INVALID', reason: 'Price cannot be negative' };
    }

    if (price === 0) {
      return { status: 'INVALID', reason: 'Price cannot be zero' };
    }

    // Basic outlier detection (e.g. price drops or jumps by more than 20% in one day)
    // In a real system, circuit breakers (e.g., 10%, 20%) would determine this more accurately.
    if (previousClosePrice !== null && previousClosePrice > 0) {
      const change = Math.abs((price - previousClosePrice) / previousClosePrice) * 100;
      if (change > 25) {
         return { status: 'UNVERIFIED', reason: `Price changed by >25% in one session (${change.toFixed(2)}%)` };
      }
    }

    // Default to observation status if all checks pass (e.g. MOCK or VERIFIED)
    return { status: observation.status === 'MOCK' ? 'MOCK' : 'VERIFIED' };
  }
}
