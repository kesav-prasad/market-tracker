import { subDays, subYears, startOfDay } from 'date-fns';
import prisma from '../db';
import { MarketCalendarService } from './MarketCalendarService';
import { downsampleLTTB, DataPoint } from '../utils/lttb';

export type HistoricalRange = '90d' | '1y' | '5y' | '10y' | 'ytd';

export interface HistoricalChartPoint {
  date: string;
  price: number | null;
}

export class HistoricalDataService {
  /**
   * Fetches the historical price chart data for a specific range.
   * Ensures missing trading sessions are represented as null to create visual gaps.
   * Applies LTTB downsampling for larger datasets (5y, 10y) to optimize rendering.
   */
  static async getChartData(symbol: string, range: HistoricalRange): Promise<HistoricalChartPoint[]> {
    const instrument = await prisma.instrument.findUnique({ where: { symbol } });
    if (!instrument) {
      throw new Error(`Instrument ${symbol} not found`);
    }

    const endDate = startOfDay(new Date());
    let startDate: Date;

    if (range === '90d') {
      // 90 actual trading sessions, not 90 calendar days
      let current = endDate;
      let sessionCount = 0;
      while (sessionCount < 90) {
        current = await MarketCalendarService.getPreviousTradingSession(current, instrument.marketCalendarId);
        sessionCount++;
      }
      startDate = current;
    } else if (range === '1y') {
      startDate = subYears(endDate, 1);
    } else if (range === 'ytd') {
      startDate = new Date('2026-01-01T00:00:00'); // January 1st (First trading day of year in spreadsheet)
    } else if (range === '5y') {
      startDate = subYears(endDate, 5);
    } else if (range === '10y') {
      startDate = subYears(endDate, 10);
    } else {
      throw new Error(`Invalid range ${range}`);
    }

    // Generate expected sessions
    const expectedSessions = await MarketCalendarService.generateTradingSessions(startDate, endDate, instrument.marketCalendarId);
    
    // Fetch actual data
    const observations = await prisma.priceObservation.findMany({
      where: {
        instrumentId: instrument.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['VERIFIED', 'PROVISIONAL', 'MOCK'] } // Ignore UNVERIFIED, INVALID, MISSING (which we'll render as null explicitly)
      },
      orderBy: { date: 'asc' },
    });

    if (symbol === 'POWERINDIA') {
      console.log(`DEBUG: POWERINDIA observations count: ${observations.length}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
    }

    const obsMap = new Map<number, number | null>();
    for (const obs of observations) {
      obsMap.set(startOfDay(obs.date).getTime(), obs.price);
    }

    // Map sessions to data
    const fullDataset: HistoricalChartPoint[] = [];
    for (const session of expectedSessions) {
      const sessionTime = session.getTime();
      let price: number | null | undefined = obsMap.get(sessionTime);

      if (sessionTime === startOfDay(new Date('2026-01-27T00:00:00')).getTime() && symbol === 'POWERINDIA') {
        console.log(`DEBUG: For ${symbol}, sessionTime: ${sessionTime}, keys: ${Array.from(obsMap.keys())}`);
      }
      
      if (price !== undefined && price !== null) {
        fullDataset.push({
          date: session.toISOString(),
          price: price
        });
      }
    }

    // Downsample if needed (5y, 10y)
    if (range === '5y' || range === '10y') {
      return this.downsampleWithGaps(fullDataset, 150);
    }

    return fullDataset;
  }

  /**
   * Applies LTTB downsampling while preserving null gaps.
   * It splits the dataset into continuous segments, downsamples each, and recombines.
   */
  private static downsampleWithGaps(data: HistoricalChartPoint[], threshold: number): HistoricalChartPoint[] {
    const segments: HistoricalChartPoint[][] = [];
    let currentSegment: HistoricalChartPoint[] = [];
    const validDataLength = data.filter(d => d.price !== null).length;

    if (validDataLength <= threshold) {
      return data;
    }

    for (const point of data) {
      if (point.price === null) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        // Push the gap itself as a segment of length 1
        segments.push([point]);
      } else {
        currentSegment.push(point);
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    const downsampled: HistoricalChartPoint[] = [];
    for (const segment of segments) {
      if (segment.length === 1 && segment[0].price === null) {
        downsampled.push(segment[0]);
      } else {
        // Apportion threshold based on segment size relative to total valid points
        const segmentThreshold = Math.max(3, Math.floor((segment.length / validDataLength) * threshold));
        
        const dataPoints: DataPoint[] = segment.map(s => ({
          x: new Date(s.date),
          y: s.price!
        }));
        
        const reduced = downsampleLTTB(dataPoints, segmentThreshold);
        
        downsampled.push(...reduced.map(r => ({
          date: r.x.toISOString(),
          price: r.y
        })));
      }
    }

    return downsampled;
  }
}
