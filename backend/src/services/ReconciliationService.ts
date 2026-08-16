import prisma from '../db';
import { startOfDay } from 'date-fns';

export class ReconciliationService {
  /**
   * Import a Google Sheet snapshot and run reconciliation
   */
  static async importSnapshotAndReconcile(snapshots: any[]) {
    for (const snap of snapshots) {
      const marketDate = startOfDay(new Date(snap.marketDate));
      
      // 1. Save Snapshot
      await prisma.googleSheetSnapshot.create({
        data: {
          marketDate,
          instrumentSymbol: snap.instrumentSymbol,
          referencePrice: snap.referencePrice,
          currentPrice: snap.currentPrice,
          previousClose: snap.previousClose,
          todayChange: snap.todayChange,
          seriesChange: snap.seriesChange,
          sourceInfo: 'Google Sheet Import'
        }
      });

      // 2. Run Reconciliation against App Data
      const instrument = await prisma.instrument.findUnique({ where: { symbol: snap.instrumentSymbol } });
      if (!instrument) continue;

      const dailyMetric = await prisma.dailyMetric.findFirst({
        where: {
          instrumentId: instrument.id,
          date: marketDate
        }
      });

      const compareAndStore = async (metricName: string, sheetVal: number | null | undefined, appVal: number | null | undefined) => {
        let status = 'MATCH';
        let diff = 0;
        
        if (sheetVal == null && appVal == null) {
          status = 'MATCH';
        } else if (sheetVal == null) {
          status = 'MISSING_SHEET';
        } else if (appVal == null) {
          status = 'MISSING_APP';
        } else {
          // Both have values, compare them. Tolerance for floating point differences (e.g. 0.0001)
          // The exact numbers should be compared with reasonable precision.
          diff = parseFloat((appVal - sheetVal).toFixed(4));
          if (Math.abs(diff) > 0.001) { // 0.1% or very small float diff depending on the metric
            status = 'MISMATCH';
          }
        }

        await prisma.reconciliationRecord.create({
          data: {
            marketDate,
            instrumentSymbol: snap.instrumentSymbol,
            metric: metricName,
            sheetValue: sheetVal ?? null,
            appValue: appVal ?? null,
            difference: diff,
            status
          }
        });
      };

      await compareAndStore('REFERENCE_PRICE', snap.referencePrice, dailyMetric?.referencePrice);
      await compareAndStore('CURRENT_PRICE', snap.currentPrice, dailyMetric?.price);
      await compareAndStore('PREVIOUS_CLOSE', snap.previousClose, dailyMetric?.previousClosePrice);
      await compareAndStore('TODAY_CHANGE', snap.todayChange, dailyMetric?.todayChange);
      await compareAndStore('SERIES_CHANGE', snap.seriesChange, dailyMetric?.seriesChange);
    }
  }

  static async getReconciliationResults() {
    return prisma.reconciliationRecord.findMany({
      orderBy: [
        { marketDate: 'desc' },
        { instrumentSymbol: 'asc' },
        { metric: 'asc' }
      ],
      take: 200
    });
  }
}
