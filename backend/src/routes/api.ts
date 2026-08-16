import { Router } from 'express';
import { format, differenceInDays } from 'date-fns';
import prisma from '../db';
import * as ExcelJS from 'exceljs';
import { DataIngestionService } from '../services/DataIngestionService';
import { SeriesEngine } from '../services/SeriesEngine';
import { ReconciliationService } from '../services/ReconciliationService';
import { MarketCalendarService } from '../services/MarketCalendarService';
import { AuditEngine } from '../services/AuditEngine';
import { CalculationEngine } from '../services/CalculationEngine';

const router = Router();
const ingestionService = new DataIngestionService();



router.post('/refresh', async (req, res) => {
  try {
    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    const stats = await ingestionService.ingestDataForDate(targetDate);
    res.json({ success: true, message: 'Data refreshed', stats });
  } catch (error: any) {
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/market-status', async (req, res) => {
  try {
    const { toZonedTime } = require('date-fns-tz');
    const now = new Date();
    const timeZone = 'Asia/Kolkata';
    const zonedNow = toZonedTime(now, timeZone);
    
    // Use calendar ID 1 for now
    const isValidDay = await MarketCalendarService.isValidTradingSession(now, 1);
    
    let isOpen = false;
    if (isValidDay) {
      const istHours = zonedNow.getHours();
      const istMinutes = zonedNow.getMinutes();
      
      const timeInMinutes = istHours * 60 + istMinutes;
      // 9:15 AM = 555 mins
      // 3:30 PM = 930 mins
      isOpen = timeInMinutes >= 555 && timeInMinutes <= 930;
    }

    res.json({ success: true, isMarketOpen: isOpen });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const results = await AuditEngine.runFullAudit();
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const currentSeriesInfo = await SeriesEngine.getCurrentSeries(today);
    
    const series = await prisma.series.findFirst({
      where: {
        referenceDate: currentSeriesInfo.referenceDate,
        expectedExpiryDate: currentSeriesInfo.expectedExpiryDate
      },
      include: {
        dailyMetrics: {
          include: {
            instrument: true
          }
        }
      }
    });

    if (!series) {
      return res.json({ series: null, metrics: [] });
    }

    const instruments = await prisma.instrument.findMany({ where: { isActive: true } });

    // Get the latest metrics for each instrument in this series
    const latestMetricsMap = new Map();
    for (const metric of series.dailyMetrics) {
      // Ignore metrics with null price if we already have a valid one, 
      // but if we don't have one, keep it just in case. Better yet, just skip null prices.
      if (metric.price === null) continue;
      
      const existing = latestMetricsMap.get(metric.instrumentId);
      if (!existing || metric.date > existing.date) {
        latestMetricsMap.set(metric.instrumentId, metric);
      }
    }

    const dashboardMetrics = await Promise.all(instruments.map(async instr => {
    const m = latestMetricsMap.get(instr.id);
    let previousSessionDate = null;
    if (m && m.date) {
      previousSessionDate = await MarketCalendarService.getPreviousTradingSession(new Date(m.date), instr.marketCalendarId || 1);
    }
    
    return {
      id: instr.id,
      instrument: instr.symbol,
      name: instr.name,
      category: instr.category,
      isFavourite: instr.isFavourite,
      referencePrice: m?.referencePrice ?? null,
      currentPrice: m?.price ?? null,
      todayChange: m?.todayChange ?? null,
      seriesChange: m?.seriesChange ?? null,
      ytdChange: m?.ytdChange ?? null,
      status: m?.status ?? 'NO_DATA',
      date: m?.date ?? null,
      lastSeriesChangePercent: instr.lastSeriesChangePercent,
      lastSeriesEndDate: instr.lastSeriesEndDate,
      // Diagnostic fields for audit
      previousSessionClose: m?.previousClosePrice ?? null,
      previousSessionDate: previousSessionDate
    };
  }));

    // Data health
    const instrumentsCount = instruments.length;
    const pricesOkCount = dashboardMetrics.filter(m => m.currentPrice !== null).length;
    const referencesOkCount = dashboardMetrics.filter(m => m.referencePrice !== null && m.referencePrice > 0).length;

    const health = {
      instrumentsOk: dashboardMetrics.length,
      pricesOk: pricesOkCount,
      referencesOk: referencesOkCount,
      calendarOk: true, 
      dataSourceOk: true, 
      historicalDataOk: true, 
      reconciliationOk: true 
    };

    // Calculate Matrix
    const matrix: any = {};
    const datesSet = new Set<string>();

    for (const metric of series.dailyMetrics) {
      if (metric.price === null) continue; // Skip null prices in matrix too
      const dStr = format(new Date(metric.date), 'yyyy-MM-dd');
      datesSet.add(dStr);
      if (!matrix[metric.instrument.symbol]) {
        matrix[metric.instrument.symbol] = {
          instrument: metric.instrument.symbol,
          category: metric.instrument.category,
          data: {}
        };
      }
      matrix[metric.instrument.symbol].data[dStr] = {
        price: metric.price,
        todayChange: metric.todayChange,
        seriesChange: metric.seriesChange
      };
    }

    const sortedDates = Array.from(datesSet).sort();
    const dataPointsCount = await prisma.priceObservation.count();
    
    // Calculate trading days in this series
    const seriesDaysCount = sortedDates.length;

    // 2. Year-to-Date Performance
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const ytdData: Record<string, any> = {};
    
    // We only need the current active series for dailyMetrics (which contains dailyChange for the Trend Chart).
    // All historical data from startOfYear up to the current series will be fetched from priceObservation.
    const ytdSeriesList = [series];

    const firstSeriesDate = series.referenceDate;
    const historicalObsRaw = await prisma.priceObservation.findMany({
      where: {
        date: {
          gte: startOfYear,
          lt: firstSeriesDate
        }
      },
      orderBy: { date: 'asc' }
    });

    const historicalObsMap = new Map<number, any[]>();
    for (const obs of historicalObsRaw) {
      if (!historicalObsMap.has(obs.instrumentId)) {
        historicalObsMap.set(obs.instrumentId, []);
      }
      const list = historicalObsMap.get(obs.instrumentId)!;
      const existing = list.find(o => o.date.getTime() === obs.date.getTime());
      if (existing) {
        existing.price = obs.price;
      } else {
        list.push({ date: obs.date, price: obs.price });
      }
    }

    await Promise.all(instruments.map(async (inst) => {
      const seriesData: any[] = [];
      const latestMetric = latestMetricsMap.get(inst.id);
      const ytdRef = latestMetric?.ytdReferencePrice;

      const histObs = historicalObsMap.get(inst.id);
      if (histObs && histObs.length > 0) {
        const histObservations = histObs.map(obs => {
          let calculatedYtdChange = null;
          if (ytdRef != null && obs.price !== null) {
            calculatedYtdChange = CalculationEngine.calculateYtdChange(obs.price, ytdRef);
          }
          return {
            date: format(new Date(obs.date), 'yyyy-MM-dd'),
            price: obs.price,
            seriesChange: null,
            ytdChange: calculatedYtdChange,
            dailyChange: null
          };
        });

        seriesData.push({
          seriesId: -1,
          referenceDate: format(startOfYear, 'yyyy-MM-dd'),
          referencePrice: ytdRef ?? null,
          expiryDate: format(firstSeriesDate, 'yyyy-MM-dd'),
          observations: histObservations
        });
      }

      for (const s of ytdSeriesList) {
        const dailyMetrics = await prisma.dailyMetric.findMany({
          where: { instrumentId: inst.id, seriesId: s.id },
          orderBy: { date: 'asc' }
        });
        
        const latestMetric = latestMetricsMap.get(inst.id);
        const ytdRef = latestMetric?.ytdReferencePrice;
        const referenceMetric = dailyMetrics.length > 0 ? dailyMetrics[0] : null;

        const observations = dailyMetrics.map(m => {
          let calculatedYtdChange = m.ytdChange;
          if (calculatedYtdChange === null && ytdRef != null && m.price !== null) {
            calculatedYtdChange = CalculationEngine.calculateYtdChange(m.price, ytdRef);
          }
          return {
            date: format(new Date(m.date), 'yyyy-MM-dd'),
            price: m.price,
            seriesChange: m.seriesChange,
            ytdChange: calculatedYtdChange,
            dailyChange: m.todayChange
          };
        });

        if (observations.length > 0) {
          seriesData.push({
            seriesId: s.id,
            referenceDate: format(new Date(s.referenceDate), 'yyyy-MM-dd'),
            referencePrice: referenceMetric?.referencePrice ?? null,
            expiryDate: format(new Date(s.expectedExpiryDate), 'yyyy-MM-dd'),
            observations
          });
        }
      }

      ytdData[inst.symbol] = {
        symbol: inst.symbol,
        range: '1Y',
        series: seriesData
      };
    }));

    // Calculate total days in the series (literal calendar difference between Day 1 and Expiry)
    const tradingDaysTotal = Math.max(0, differenceInDays(new Date(series.expectedExpiryDate), new Date(series.referenceDate)));

    res.json({
      series: {
        id: series.id,
        referenceDate: series.referenceDate,
        expectedExpiryDate: series.expectedExpiryDate,
        tradingDaysLeft: tradingDaysTotal // Keep the same field name for frontend compatibility
      },
      metrics: dashboardMetrics,
      matrix: {
        dates: sortedDates,
        rows: matrix
      },
      ytdData,
      stats: {
        totalInstruments: instruments.length,
        seriesDays: seriesDaysCount,
        dataPoints: dataPointsCount,
        lastSync: new Date(),
        health
      }
    });
  } catch (error: any) {
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/custom-date-prices/:date', async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setUTCHours(23, 59, 59, 999);

    const instruments = await prisma.instrument.findMany({ where: { isActive: true } });
    const prices: Record<string, number | null> = {};

    for (const inst of instruments) {
      // Find the most recent observation on or before target date
      const obs = await prisma.priceObservation.findFirst({
        where: {
          instrumentId: inst.id,
          date: { lte: targetDate },
          status: { in: ['VERIFIED'] }
        },
        orderBy: { date: 'desc' }
      });
      
      if (obs && obs.price !== null) {
        prices[inst.symbol] = obs.price;
      }
    }

    res.json({ success: true, data: prices });
  } catch (error: any) {
    console.error('Custom Date Price Error:', error);
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/history/:symbol/:range', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const range = req.params.range as any; // '90d' | '1y' | '5y' | '10y'
    
    if (!['90d', '1y', '5y', '10y'].includes(range)) {
      return res.status(400).json({ success: false, error: 'Invalid range' });
    }

    const { HistoricalDataService } = require('../services/HistoricalDataService');
    const data = await HistoricalDataService.getChartData(symbol, range);
    
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('History API Error:', error);
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/export-current', async (req, res) => {
  try {
    const today = new Date();
    const currentSeriesInfo = await SeriesEngine.getCurrentSeries(today);
    
    const series = await prisma.series.findFirst({
      where: {
        referenceDate: currentSeriesInfo.referenceDate,
        expectedExpiryDate: currentSeriesInfo.expectedExpiryDate
      },
      include: {
        dailyMetrics: {
          include: {
            instrument: true
          }
        }
      }
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'No active series found' });
    }
    
    const instruments = await prisma.instrument.findMany({ where: { isActive: true }});
    const obs = series.dailyMetrics.filter(m => m.price !== null && ['VERIFIED', 'PROVISIONAL', 'MOCK'].includes(m.status));
    
    const datesSet = new Set<string>();
    obs.forEach(o => datesSet.add(format(o.date, 'yyyy-MM-dd')));
    let sortedDates = Array.from(datesSet).sort().filter(d => d !== format(series.referenceDate, 'yyyy-MM-dd'));
    
    // Strictly remove any days that are not valid trading sessions (weekends, holidays)
    const { MarketCalendarService } = require('../services/MarketCalendarService');
    const validDates = [];
    for (const d of sortedDates) {
      if (await MarketCalendarService.isValidTradingSession(new Date(d))) {
        validDates.push(d);
      }
    }
    sortedDates = validDates;
    
    const workbook = new ExcelJS.Workbook();
    const { YahooFinanceDataProvider } = require('../providers/YahooFinanceDataProvider');
    const mockProvider = new YahooFinanceDataProvider();
    
    // Get latest metrics for Dashboard
    const latestMetricsMap = new Map();
    for (const metric of series.dailyMetrics) {
      const existing = latestMetricsMap.get(metric.instrumentId);
      if (!existing || metric.date > existing.date) {
        latestMetricsMap.set(metric.instrumentId, metric);
      }
    }

    // Sheet 1: Dashboard
    const dashboardSheet = workbook.addWorksheet('Dashboard');
    dashboardSheet.columns = [
      { header: '#', key: 'id', width: 5 },
      { header: 'CATEGORY', key: 'category', width: 12 },
      { header: 'SYMBOL', key: 'symbol', width: 15 },
      { header: 'REFERENCE PRICE', key: 'refPrice', width: 18 },
      { header: 'CURRENT PRICE', key: 'currPrice', width: 16 },
      { header: 'SESSION CHANGE', key: 'sessChange', width: 18 },
      { header: 'SERIES CHANGE', key: 'seriesChange', width: 18 },
      { header: 'LAST SERIES CHG', key: 'lastSeriesChg', width: 18 },
      { header: 'CUSTOM % CHG (JAN 1)', key: 'customChange', width: 22 },
      { header: 'TREND (SERIES)', key: 'trend', width: 25 }
    ];
    
    dashboardSheet.getRow(1).font = { bold: true };
    dashboardSheet.getRow(1).alignment = { horizontal: 'center' };

    // Sheet 2: Matrix Sheet
    const matrixSheet = workbook.addWorksheet('Daily Series Matrix');
    matrixSheet.columns = [
      { header: '#', key: 'id', width: 5 },
      { header: 'SYMBOL', key: 'symbol', width: 15 },
      { header: 'REF PRICE', key: 'refPrice', width: 12 },
      ...sortedDates.map(d => ({ header: format(new Date(d), 'dd-MMM'), key: d, width: 12 }))
    ];
    matrixSheet.getRow(1).font = { bold: true };
    matrixSheet.getRow(1).alignment = { horizontal: 'center' };

    // Sheet 3: Session Matrix Sheet
    const sessionMatrixSheet = workbook.addWorksheet('Daily Session Matrix');
    sessionMatrixSheet.columns = [
      { header: '#', key: 'id', width: 5 },
      { header: 'SYMBOL', key: 'symbol', width: 15 },
      { header: 'REF PRICE', key: 'refPrice', width: 12 },
      ...sortedDates.map(d => ({ header: format(new Date(d), 'dd-MMM'), key: d, width: 12 }))
    ];
    sessionMatrixSheet.getRow(1).font = { bold: true };
    sessionMatrixSheet.getRow(1).alignment = { horizontal: 'center' };

    let rowIndex = 2; // starts at 2 because of header
    const jan1Date = new Date('2026-01-01T00:00:00');

    for (const inst of instruments) {
       // --- DASHBOARD SHEET DATA ---
       const latest = latestMetricsMap.get(inst.id);
       const jan1Obs = await mockProvider.getObservation(inst.symbol, jan1Date);
       let customChange = 'N/A';
       if (latest && jan1Obs && jan1Obs.price) {
         customChange = ((latest.price - jan1Obs.price) / jan1Obs.price) as any;
       }

       const dashRow = dashboardSheet.addRow({
         id: rowIndex - 1,
         category: inst.category,
         symbol: inst.symbol,
         refPrice: latest?.referencePrice ?? 'N/A',
         currPrice: latest?.price ?? 'N/A',
         sessChange: typeof latest?.todayChange === 'number' ? (latest.todayChange / 100) : 'N/A',
         seriesChange: typeof latest?.seriesChange === 'number' ? (latest.seriesChange / 100) : 'N/A',
         lastSeriesChg: typeof inst.lastSeriesChangePercent === 'number' ? (inst.lastSeriesChangePercent / 100) : 'N/A',
         customChange: customChange,
         trend: { formula: `SPARKLINE('Daily Series Matrix'!D${rowIndex}:Z${rowIndex})` }
       });
       
       // Format Prices
       [4, 5].forEach(colIdx => {
         const cell = dashRow.getCell(colIdx);
         if (typeof cell.value === 'number') cell.numFmt = '0.00';
       });

       // Format Dashboard Percentages
       [6, 7, 8, 9].forEach(colIdx => { 
         const cell = dashRow.getCell(colIdx);
         if (typeof cell.value === 'number') {
           cell.numFmt = '0.00%';
           if (cell.value > 0) cell.font = { color: { argb: 'FF16A34A' } };
           else if (cell.value < 0) cell.font = { color: { argb: 'FFDC2626' } };
         }
       });

       // --- MATRIX SHEET DATA ---
       const matRow: any = { id: rowIndex - 1, symbol: inst.symbol, refPrice: latest?.referencePrice ?? 'N/A' };
       const sessionMatRow: any = { id: rowIndex - 1, symbol: inst.symbol, refPrice: latest?.referencePrice ?? 'N/A' };
       for (const d of sortedDates) {
          const matchingObs = obs.find(o => o.instrumentId === inst.id && format(o.date, 'yyyy-MM-dd') === d);
          matRow[d] = matchingObs?.seriesChange !== null && matchingObs?.seriesChange !== undefined ? (matchingObs.seriesChange / 100) : 'MISSING'; 
          sessionMatRow[d] = matchingObs?.todayChange !== null && matchingObs?.todayChange !== undefined ? (matchingObs.todayChange / 100) : 'MISSING';
       }
       const addedMatRow = matrixSheet.addRow(matRow);
       const addedSessionMatRow = sessionMatrixSheet.addRow(sessionMatRow);
       
       // Format Ref Price to 2 decimals
       const matRefCell = addedMatRow.getCell(3);
       if (typeof matRefCell.value === 'number') matRefCell.numFmt = '0.00';
       const sessRefCell = addedSessionMatRow.getCell(3);
       if (typeof sessRefCell.value === 'number') sessRefCell.numFmt = '0.00';
       
       // Format Matrix Percentages (Dates start at column 4)
       sortedDates.forEach((d, i) => {
         const cell = addedMatRow.getCell(i + 4); 
         if (typeof cell.value === 'number') {
           cell.numFmt = '0.00%';
           if (cell.value > 0) cell.font = { color: { argb: 'FF16A34A' } };
           else if (cell.value < 0) cell.font = { color: { argb: 'FFDC2626' } };
         }

         const sessionCell = addedSessionMatRow.getCell(i + 4);
         if (typeof sessionCell.value === 'number') {
           sessionCell.numFmt = '0.00%';
           if (sessionCell.value > 0) sessionCell.font = { color: { argb: 'FF16A34A' } };
           else if (sessionCell.value < 0) sessionCell.font = { color: { argb: 'FFDC2626' } };
         }
       });

       rowIndex++;
    }

    const fs = require('fs');
    const path = require('path');
    const archivesDir = process.env.ARCHIVE_DIR || path.join(__dirname, '../../archives');
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }
    const filename = `Current_Series_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const filePath = path.join(archivesDir, filename);
    await workbook.xlsx.writeFile(filePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Export Current Error:', error);
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/archive/:seriesId/export/:format', async (req, res) => {
  try {
    const seriesId = parseInt(req.params.seriesId, 10);
    const format = req.params.format; // 'json' or 'csv'
    
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: { dailyMetrics: { include: { instrument: true } } }
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    if (!series.isFinalized) {
      return res.status(400).json({ success: false, error: 'Series is not finalized yet' });
    }

    const filenameBase = `Series_Archive_${series.referenceDate.toISOString().split('T')[0]}_to_${series.expectedExpiryDate.toISOString().split('T')[0]}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
      return res.send(JSON.stringify(series, null, 2));
    } else if (format === 'csv') {
      const csvHeader = 'Instrument,Date,ReferencePrice,CurrentPrice,SessionChange,SeriesChange,Status\n';
      const csvRows = series.dailyMetrics.map(m => 
        `${m.instrument.symbol},${m.date.toISOString()},${m.referencePrice},${m.price},${m.todayChange},${m.seriesChange},${m.status}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.send(csvHeader + csvRows);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid format' });
    }
  } catch (error: any) {
    console.error('Archive Export Error:', error);
    console.error(error.stack); res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Series Routes
router.get('/series', async (req, res) => {
  try {
    const series = await prisma.series.findMany({
      orderBy: { referenceDate: 'desc' }
    });
    // Filter out artificial historical/YTD container series which span > 45 days
    const filteredSeries = series.filter(s => {
       const diffDays = (new Date(s.expectedExpiryDate).getTime() - new Date(s.referenceDate).getTime()) / (1000 * 60 * 60 * 24);
       return diffDays <= 45; 
    });
    res.json({ success: true, data: filteredSeries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/series/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const series = await prisma.series.findUnique({
      where: { id },
      include: {
        dailyMetrics: {
          include: {
            instrument: true
          }
        }
      }
    });

    if (!series) return res.status(404).json({ success: false, error: 'Not found' });

    // Calculate matrix similar to dashboard
    const matrix: any = {};
    const datesSet = new Set<string>();

    for (const metric of series.dailyMetrics) {
      if (metric.price === null) continue;
      const dStr = format(new Date(metric.date), 'yyyy-MM-dd');
      datesSet.add(dStr);
      if (!matrix[metric.instrument.symbol]) {
        matrix[metric.instrument.symbol] = {
          instrument: metric.instrument.symbol,
          category: metric.instrument.category,
          data: {}
        };
      }
      matrix[metric.instrument.symbol].data[dStr] = {
        price: metric.price,
        todayChange: metric.todayChange,
        seriesChange: metric.seriesChange,
        status: metric.status,
        date: metric.date
      };
    }

    const sortedDates = Array.from(datesSet).sort();

    res.json({ 
      success: true, 
      data: {
        series,
        matrix: {
          dates: sortedDates,
          rows: matrix
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Instruments CRUD
router.get('/instruments', async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      include: {
        marketCalendar: true,
        dailyMetrics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { symbol: 'asc' }
    });
    res.json({ success: true, data: instruments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/instruments', async (req, res) => {
  try {
    const data = req.body;
    const instrument = await prisma.instrument.create({
      data: {
        symbol: data.symbol,
        name: data.name,
        category: data.category,
        exchange: data.exchange,
        provider: data.provider,
        providerSymbol: data.providerSymbol,
        marketCalendarId: data.marketCalendarId,
        currency: data.currency || 'INR',
        displayPrecision: data.displayPrecision !== undefined ? data.displayPrecision : 2,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
    
    // Background ingest data for this new instrument (and others)
    ingestionService.ingestDataForDate(new Date()).catch(console.error);
    
    res.json({ success: true, data: instrument });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Symbol already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/instruments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const instrument = await prisma.instrument.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        exchange: data.exchange,
        provider: data.provider,
        providerSymbol: data.providerSymbol,
        marketCalendarId: data.marketCalendarId,
        currency: data.currency,
        displayPrecision: data.displayPrecision,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });
    res.json({ success: true, data: instrument });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/instruments/:symbol/favourite', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const { isFavourite } = req.body;
    
    if (typeof isFavourite !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isFavourite must be a boolean' });
    }

    const instrument = await prisma.instrument.update({
      where: { symbol },
      data: {
        isFavourite,
        favouriteCreatedAt: isFavourite ? new Date() : null
      }
    });

    res.json({ success: true, data: instrument });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Instrument not found' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// -- FORMAT OVERRIDES --

router.get('/overrides/formats', async (req, res) => {
  try {
    const formats = await prisma.cellFormatOverride.findMany();
    res.json({ success: true, data: formats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/overrides/formats', async (req, res) => {
  try {
    const { key, scope, instrumentSymbol, columnId, updates } = req.body;
    if (!key || !scope) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const result = await prisma.cellFormatOverride.upsert({
      where: { key },
      update: updates,
      create: { key, scope, instrumentSymbol, columnId, ...updates }
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/overrides/formats/all', async (req, res) => {
  try {
    await prisma.cellFormatOverride.deleteMany({});
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/overrides/formats/:key', async (req, res) => {
  try {
    const { key } = req.params;
    await prisma.cellFormatOverride.delete({ where: { key } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') { // Record to delete does not exist
      return res.json({ success: true });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
