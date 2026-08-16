import prisma from '../db';
import { MarketCalendarService } from './MarketCalendarService';
import fs from 'fs';
import path from 'path';

export class ArchiveService {
  /**
   * Attempts to finalize a series.
   * Throws an error with the exact reason if any of the 8 validation gates fail.
   */
  static async finalizeSeries(seriesId: number, archiveDir: string): Promise<void> {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: { dailyMetrics: true }
    });

    if (!series) throw new Error('Series not found');
    if (series.isFinalized) throw new Error('Series is already finalized');

    // 1. Determine the actual expiry/reference trading session
    const instruments = await prisma.instrument.findMany({ where: { isActive: true } });

    // 2. Confirm the session is valid
    const isExpiryValid = await MarketCalendarService.isValidTradingSession(series.expectedExpiryDate);
    if (!isExpiryValid) {
      throw new Error(`Expected expiry date ${series.expectedExpiryDate.toISOString()} is not a valid trading session.`);
    }

    for (const instrument of instruments) {
      // 3. Verify required observations exist on the expiry date
      const expiryObs = await prisma.priceObservation.findFirst({
        where: {
          instrumentId: instrument.id,
          date: series.expectedExpiryDate
        }
      });
      if (!expiryObs || expiryObs.price === null) {
        throw new Error(`Missing final price observation for ${instrument.symbol} on expiry date ${series.expectedExpiryDate.toISOString()}`);
      }

      // 4. Verify reference prices
      const firstMetric = await prisma.dailyMetric.findFirst({
        where: { seriesId: series.id, instrumentId: instrument.id },
        orderBy: { date: 'asc' }
      });
      if (!firstMetric || firstMetric.referencePrice === null) {
        throw new Error(`Missing reference price for ${instrument.symbol}`);
      }

      // 5. Verify final market observations
      if (expiryObs.status === 'UNVERIFIED' || expiryObs.status === 'INVALID' || expiryObs.status === 'STALE') {
        throw new Error(`Final observation for ${instrument.symbol} is not verified (status: ${expiryObs.status})`);
      }

      // 6. Check unresolved validation errors / 7. Check unresolved discrepancies
      const openDiscrepancies = await prisma.discrepancy.count({
        where: {
          priceObservation: { instrumentId: instrument.id, date: { gte: series.referenceDate, lte: series.expectedExpiryDate } },
          resolved: false
        }
      });
      if (openDiscrepancies > 0) {
        throw new Error(`Unresolved discrepancies exist for ${instrument.symbol} in this series.`);
      }
    }

    // 8. Mark isFinalized = true
    await prisma.series.update({
      where: { id: series.id },
      data: { 
        isFinalized: true,
        finalizationTimestamp: new Date()
      }
    });

    // 9. Update Instrument with Last Series snapshot
    for (const instrument of instruments) {
      const finalMetric = series.dailyMetrics.find(m => m.instrumentId === instrument.id && m.date.getTime() === series.expectedExpiryDate.getTime());
      if (finalMetric && finalMetric.seriesChange !== null) {
        await prisma.instrument.update({
          where: { id: instrument.id },
          data: {
            lastSeriesChangePercent: finalMetric.seriesChange,
            lastSeriesEndDate: series.expectedExpiryDate
          }
        });
      }
    }

    // ARCHIVE BACKUP
    await this.exportArchive(seriesId, archiveDir);
  }

  static async exportArchive(seriesId: number, archiveDir: string): Promise<void> {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: { 
        dailyMetrics: {
          include: { instrument: true }
        }
      }
    });

    if (!series) return;

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const filenameBase = `Series_Archive_${series.referenceDate.toISOString().split('T')[0]}_to_${series.expectedExpiryDate.toISOString().split('T')[0]}`;
    
    // JSON
    const jsonPath = path.join(archiveDir, `${filenameBase}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(series, null, 2));

    // CSV
    const csvPath = path.join(archiveDir, `${filenameBase}.csv`);
    const csvHeader = 'Instrument,Date,ReferencePrice,CurrentPrice,SessionChange,SeriesChange,Status\n';
    const csvRows = series.dailyMetrics.map(m => 
      `${m.instrument.symbol},${m.date.toISOString()},${m.referencePrice},${m.price},${m.todayChange},${m.seriesChange},${m.status}`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
  }
}
