import { MarketDataProviderFactory } from '../providers/MarketDataProviderFactory';
import { ValidationEngine } from './ValidationEngine';
import { CalculationEngine } from './CalculationEngine';
import { MarketCalendarService } from './MarketCalendarService';
import { SeriesEngine } from './SeriesEngine';
import prisma from '../db';
import { startOfDay } from 'date-fns';

export class DataIngestionService {
  constructor() {
  }

  /**
   * Fetch, validate, and store data for a specific date for all active instruments
   */
  async ingestDataForDate(date: Date) {
    let targetDate = startOfDay(date);
    const isValidSession = await MarketCalendarService.isValidTradingSession(targetDate);
    
    if (!isValidSession) {
      console.log(`Skipping ingestion: ${targetDate.toISOString()} is not a valid trading session. Falling back to previous trading session.`);
      targetDate = await MarketCalendarService.getPreviousTradingSession(targetDate);
    }

    const currentSeries = await SeriesEngine.getCurrentSeries(targetDate);
    
    // Attempt to finalize previous unfinalized series if we are crossing boundaries
    const oldSeries = await prisma.series.findFirst({
      where: { isFinalized: false, expectedExpiryDate: { lt: targetDate } },
      orderBy: { expectedExpiryDate: 'desc' }
    });

    if (oldSeries) {
      const { ArchiveService } = require('./ArchiveService');
      const archiveDir = process.env.ARCHIVE_DIR || './archives';
      try {
        await ArchiveService.finalizeSeries(oldSeries.id, archiveDir);
      } catch (e: any) {
         throw new Error(`Cannot start new series on ${targetDate.toISOString()} because previous series finalization failed: ${e.message}`);
      }
    }

    let series = await prisma.series.findFirst({
      where: {
        referenceDate: currentSeries.referenceDate,
        expectedExpiryDate: currentSeries.expectedExpiryDate
      }
    });

    if (!series) {
      series = await prisma.series.create({
        data: {
          referenceDate: currentSeries.referenceDate,
          expectedExpiryDate: currentSeries.expectedExpiryDate,
          isFinalized: false
        }
      });
    }

    const instruments = await prisma.instrument.findMany({ where: { isActive: true } });

    let updated = 0;
    let missing = 0;
    let errors = 0;

    for (const instrument of instruments) {
      // Throttle for Yahoo Finance rate limits
      console.log("processing " + instrument.symbol); await new Promise(resolve => setTimeout(resolve, 150));
      
      try {
        // 1. Get Provider
      const provider = MarketDataProviderFactory.getProvider(instrument.provider);

      const corporateActions = await prisma.corporateActionFactor.findMany({
        where: { instrumentId: instrument.id },
        orderBy: { date: 'asc' }
      });
      
      const applyCorporateActions = (price: number | null, date: Date | null) => {
        if (price === null || price === undefined || isNaN(price) || date === null) return price;
        let adjustedPrice = price;
        for (const ca of corporateActions) {
           // FIX: Only apply the CA if the reference date is before the CA, 
           // AND the current target date we are calculating for is ON or AFTER the CA.
           if (date < ca.date && targetDate >= ca.date) {
             adjustedPrice = adjustedPrice * ca.adjustmentFactor;
           }
        }
        return adjustedPrice;
      };

      // 2. Fetch Observation
      let previousClose: number | null = null;
      const prevSessionDate = await MarketCalendarService.getPreviousTradingSession(targetDate, instrument.marketCalendarId);
      
      const prevObs = await prisma.priceObservation.findFirst({
        where: {
          instrumentId: instrument.id,
          date: prevSessionDate,
          status: 'VERIFIED'
        },
        orderBy: { timestamp: 'desc' }
      });
      let prevObsPrice = (prevObs?.price !== undefined && prevObs?.price !== null && !isNaN(prevObs.price)) ? prevObs.price : null;
      if (prevObsPrice === null) {
          const prevProviderObs = await provider.getObservation(instrument.symbol, prevSessionDate, instrument.providerSymbol);
          prevObsPrice = prevProviderObs.price;
      }
      previousClose = applyCorporateActions(prevObsPrice, prevSessionDate);

      // 3. Validate
      let obs;
      const today = startOfDay(new Date());
      if (targetDate.getTime() === today.getTime()) {
        obs = await provider.getLatestObservation(instrument.symbol, instrument.providerSymbol);
        obs.date = targetDate; // Normalize to targetDate for DB storage
      } else {
        obs = await provider.getObservation(instrument.symbol, targetDate, instrument.providerSymbol);
      }
      
      const validation = ValidationEngine.validateObservation(obs, previousClose);
      let finalStatus = validation.status;
      
      // Override status if mock provider returned MISSING
      if (obs.status === 'MISSING') {
         finalStatus = 'MISSING';
      }

      // 4. Store Observation (Reconciliation logic for upsert)
      const existingObs = await prisma.priceObservation.findUnique({
        where: {
          instrumentId_date_source: {
            instrumentId: instrument.id,
            date: targetDate,
            source: obs.source
          }
        }
      });

      let savedObs;
      if (existingObs) {
        savedObs = await prisma.priceObservation.update({
          where: { id: existingObs.id },
          data: {
            price: (obs.price !== null && !isNaN(obs.price)) ? obs.price : null,
            status: finalStatus
          }
        });
      } else {
        savedObs = await prisma.priceObservation.create({
          data: {
            instrumentId: instrument.id,
            date: targetDate,
            price: (obs.price !== null && !isNaN(obs.price)) ? obs.price : null,
            source: obs.source,
            status: finalStatus,
            timestamp: obs.timestamp
          }
        });
      }

      // 5. Calculate Metrics
      // We need the reference price. 
      // If today is the reference date, this observation IS the reference price.
      let referencePrice: null | number = null;
      let rawRefPrice: null | number = null;
      let refDate: Date = series.referenceDate;
      if (targetDate.getTime() === series.referenceDate.getTime()) {
        if (finalStatus === 'VERIFIED') {
          rawRefPrice = (obs.price !== null && !isNaN(obs.price)) ? obs.price : null;
        } else {
          rawRefPrice = null;
        }
        refDate = targetDate;
      } else {
        const startOfDayRef = new Date(series.referenceDate);
        startOfDayRef.setUTCHours(0, 0, 0, 0);
        const endOfDayRef = new Date(series.referenceDate);
        endOfDayRef.setUTCHours(23, 59, 59, 999);

        const refMetric = await prisma.dailyMetric.findFirst({
          where: {
            instrumentId: instrument.id,
            date: {
              gte: startOfDayRef,
              lte: endOfDayRef
            }
          }
        });
        rawRefPrice = refMetric?.price ?? null;
        if (rawRefPrice === null) {
          const refObs = await provider.getObservation(instrument.symbol, series.referenceDate, instrument.providerSymbol);
          rawRefPrice = (refObs.price !== undefined && refObs.price !== null && !isNaN(refObs.price)) ? refObs.price : null;
        }
      }
      referencePrice = applyCorporateActions(rawRefPrice, refDate);

      let todayChange = null;
      let seriesChange = null;
      let ytdChange = null;
      let ytdReferenceDate: Date | null = null;
      let ytdReferencePrice: number | null = null;

      // 6. Calculate YTD Reference
      const firstOfYear = new Date(targetDate.getFullYear(), 0, 1);
      
      const ytdObs = await prisma.priceObservation.findFirst({
        where: {
          instrumentId: instrument.id,
          date: { gte: firstOfYear },
          price: { gt: 0 }
        },
        orderBy: { date: 'asc' }
      });

      if (ytdObs) {
        ytdReferenceDate = ytdObs.date;
        ytdReferencePrice = applyCorporateActions(ytdObs.price, ytdReferenceDate);
      }

      let isDataValid = finalStatus === 'VERIFIED' || finalStatus === 'MOCK';
      
      if (referencePrice === null || referencePrice === 0) {
        finalStatus = 'UNVERIFIED_REFERENCE';
        isDataValid = false;
      }

      if (isDataValid && obs.price !== null) {
         todayChange = CalculationEngine.calculateTodayChange(obs.price, previousClose ?? 0);
         if (referencePrice !== null) {
           seriesChange = CalculationEngine.calculateSeriesChange(obs.price, referencePrice);
         }
         if (ytdReferencePrice !== null) {
           ytdChange = CalculationEngine.calculateYtdChange(obs.price, ytdReferencePrice);
         }
      }

      // Update counters
      if (finalStatus === 'VERIFIED' || finalStatus === 'MOCK') {
        updated++;
      } else if (finalStatus === 'MISSING') {
        missing++;
      } else {
        errors++;
      }

      // 6. Store Daily Metric
      await prisma.dailyMetric.upsert({
        where: {
          instrumentId_seriesId_date: {
            instrumentId: instrument.id,
            seriesId: series.id,
            date: targetDate
          }
        },
        update: {
          price: isDataValid ? obs.price : null,
          referencePrice: referencePrice,
          previousClosePrice: previousClose,
          todayChange,
          seriesChange,
          ytdReferenceDate,
          ytdReferencePrice,
          ytdChange,
          status: finalStatus
        },
        create: {
          instrumentId: instrument.id,
          seriesId: series.id,
          date: targetDate,
          price: isDataValid ? obs.price : null,
          referencePrice: referencePrice,
          previousClosePrice: previousClose,
          todayChange,
          seriesChange,
          ytdReferenceDate,
          ytdReferencePrice,
          ytdChange,
          status: finalStatus
        }
      });
      
      } catch (err: any) {
        console.error(`Error processing instrument ${instrument.symbol}:`, err.message, err.stack);
        errors++;
        // Save MISSING status to prevent UI from breaking
        await prisma.dailyMetric.upsert({
          where: {
            instrumentId_seriesId_date: {
              instrumentId: instrument.id,
              seriesId: series.id,
              date: targetDate
            }
          },
          update: {
            price: null,
            status: 'MISSING'
          },
          create: {
            instrumentId: instrument.id,
            seriesId: series.id,
            date: targetDate,
            price: null,
            status: 'MISSING'
          }
        });
      }
    }

    return {
      updated,
      missing,
      errors
    };
  }
}
