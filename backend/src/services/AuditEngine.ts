import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from './CalculationEngine';

const prisma = new PrismaClient();

export interface AuditResult {
  symbol: string;
  name: string;
  exchange: string;
  provider: string;
  providerSymbol: string;
  marketDate: string | null;
  observationTimestamp: string | null;
  rawPrice: number | null;
  referencePrice: number | null;
  previousSessionPrice: number | null;
  sessionChange: number | null;
  seriesChange: number | null;
  ytdReferencePrice: number | null;
  ytdChange: number | null;
  chartStatus: string;
  sourceStatus: string;
  validationStatus: string;
  errorReason: string | null;
}

export class AuditEngine {
  static async runFullAudit(): Promise<AuditResult[]> {
    const instruments = await prisma.instrument.findMany({
      where: { isActive: true },
      include: {
        dailyMetrics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const results: AuditResult[] = [];

    for (const inst of instruments) {
      const result: AuditResult = {
        symbol: inst.symbol,
        name: inst.name,
        exchange: inst.exchange,
        provider: inst.provider,
        providerSymbol: inst.providerSymbol || 'UNKNOWN',
        marketDate: null,
        observationTimestamp: null,
        rawPrice: null,
        referencePrice: null,
        previousSessionPrice: null,
        sessionChange: null,
        seriesChange: null,
        ytdReferencePrice: null,
        ytdChange: null,
        chartStatus: 'UNVERIFIED',
        sourceStatus: 'MISSING',
        validationStatus: 'ERROR',
        errorReason: null
      };

      try {
        const latestMetric = inst.dailyMetrics[0];
        
        if (!latestMetric) {
          result.errorReason = 'No daily metrics found';
          results.push(result);
          continue;
        }

        result.marketDate = latestMetric.date.toISOString();
        
        // Find the raw observation matching this date
        const startOfDay = new Date(latestMetric.date);
        startOfDay.setUTCHours(0,0,0,0);
        const endOfDay = new Date(latestMetric.date);
        endOfDay.setUTCHours(23,59,59,999);
        
        const rawObs = await prisma.priceObservation.findFirst({
          where: {
            instrumentId: inst.id,
            date: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          orderBy: { timestamp: 'desc' }
        });

        if (!rawObs) {
          result.sourceStatus = 'MISSING_RAW';
          result.errorReason = 'No raw observation matches the daily metric date';
          results.push(result);
          continue;
        }

        result.observationTimestamp = rawObs.timestamp.toISOString();
        result.rawPrice = rawObs.price;
        result.sourceStatus = rawObs.status;
        result.referencePrice = latestMetric.referencePrice;
        result.previousSessionPrice = latestMetric.previousClosePrice;

        // Verify independent calculations using the ingested price, not a fluctuating live price
        const priceToCheck = latestMetric.price;
        const expectedSessionChange = CalculationEngine.calculateTodayChange(priceToCheck, latestMetric.previousClosePrice ?? 0);
        const expectedSeriesChange = CalculationEngine.calculateSeriesChange(priceToCheck, latestMetric.referencePrice ?? 0);
        
        let expectedYtdChange = null;
        if (latestMetric.ytdReferencePrice !== null) {
          expectedYtdChange = CalculationEngine.calculateYtdChange(priceToCheck, latestMetric.ytdReferencePrice);
          result.ytdReferencePrice = latestMetric.ytdReferencePrice;
        }

        result.sessionChange = latestMetric.todayChange;
        result.seriesChange = latestMetric.seriesChange;
        result.ytdChange = latestMetric.ytdChange;

        const isSessionOk = this.isEqualWithTolerance(expectedSessionChange, latestMetric.todayChange);
        const isSeriesOk = this.isEqualWithTolerance(expectedSeriesChange, latestMetric.seriesChange);
        const isYtdOk = this.isEqualWithTolerance(expectedYtdChange, latestMetric.ytdChange);

        if (!isSessionOk) {
          result.errorReason = `Session % mismatch: expected ${expectedSessionChange}, got ${latestMetric.todayChange}`;
        } else if (!isSeriesOk) {
          result.errorReason = `Series % mismatch: expected ${expectedSeriesChange}, got ${latestMetric.seriesChange}`;
        } else if (!isYtdOk) {
          result.errorReason = `YTD % mismatch: expected ${expectedYtdChange}, got ${latestMetric.ytdChange}`;
        } else if (rawObs.price === null || isNaN(rawObs.price)) {
          result.errorReason = 'Raw price is null or invalid';
          result.validationStatus = 'MISSING';
        } else if (latestMetric.status !== 'VERIFIED' && latestMetric.status !== 'MOCK') {
          result.errorReason = `Status is ${latestMetric.status}`;
          result.validationStatus = 'UNVERIFIED';
        } else {
          result.validationStatus = 'VERIFIED';
          result.chartStatus = 'MATCH';
        }

      } catch (err: any) {
        result.errorReason = err.message;
      }

      results.push(result);
    }

    return results;
  }

  private static isEqualWithTolerance(a: number | null, b: number | null, tol = 0.0001): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return Math.abs(a - b) < tol;
  }
}
