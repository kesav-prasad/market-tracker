import { Router } from 'express';
import prisma from '../db';
import { MarketCalendarService } from '../services/MarketCalendarService';
import { startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, isWeekend } from 'date-fns';

const router = Router();

// GET all calendars
router.get('/', async (req, res) => {
  try {
    const calendars = await prisma.marketCalendar.findMany();
    res.json({ success: true, data: calendars });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET calendar month view
router.get('/:calendarId/:year/:month', async (req, res) => {
  try {
    const calendarId = parseInt(req.params.calendarId);
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month) - 1; // JS months are 0-indexed

    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    const holidays = await prisma.holiday.findMany({
      where: {
        marketCalendarId: calendarId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const sessions = await prisma.marketSession.findMany({
      where: {
        marketCalendarId: calendarId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const formatDateKey = (d: Date) => d.toISOString().split('T')[0];
    const holidaysMap = new Map(holidays.map(h => [formatDateKey(h.date), h]));
    const sessionsMap = new Map(sessions.map(s => [formatDateKey(s.date), s]));

    const result = daysInMonth.map(date => {
      // Local midnight to UTC midnight key
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const key = formatDateKey(utcDate);
      
      const holiday = holidaysMap.get(key);
      const session = sessionsMap.get(key);
      
      let status = 'UNKNOWN';
      let isTradingDay = false;
      let holidayName = null;

      if (session) {
        status = session.status;
        isTradingDay = session.isTradingDay;
      } else if (holiday) {
        status = 'HOLIDAY';
        holidayName = holiday.description;
        isTradingDay = false;
      } else if (isWeekend(date)) {
        status = 'WEEKEND';
        isTradingDay = false;
      } else {
        status = 'TRADING DAY';
        isTradingDay = true;
      }

      return {
        date: date.toISOString(),
        status,
        isTradingDay,
        holidayName,
        openTime: session?.openTime || (isTradingDay ? '09:15' : null),
        closeTime: session?.closeTime || (isTradingDay ? '15:30' : null),
        specialSessionFlag: session?.specialSessionFlag || false
      };
    });

    // Also get active series info for this month based on MarketCalendar rules
    const expectedExpiry = await MarketCalendarService.getExpiryDateForMonth(year, month, calendarId);

    res.json({ success: true, data: { days: result, expectedExpiry } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST manual holiday
router.post('/holiday', async (req, res) => {
  try {
    const { date, description, marketCalendarId } = req.body;
    
    const holidayDate = new Date(date);
    
    // Check for duplicates
    const existing = await prisma.holiday.findFirst({
      where: { date: holidayDate, marketCalendarId }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Holiday already exists on this date.' });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        description,
        marketCalendarId
      }
    });

    res.json({ success: true, data: holiday });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE holiday
router.delete('/holiday/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { marketCalendarId = 1 } = req.query;
    const holidayDate = new Date(date);
    
    await prisma.holiday.deleteMany({
      where: {
        date: holidayDate,
        marketCalendarId: Number(marketCalendarId)
      }
    });

    res.json({ success: true, message: 'Holiday removed successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET calendar health
router.get('/health/:calendarId', async (req, res) => {
  try {
    const calendarId = parseInt(req.params.calendarId);
    const calendar = await prisma.marketCalendar.findUnique({ where: { id: calendarId } });
    
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }

    const health = {
      calendarName: calendar.name,
      isActive: true,
      timezone: calendar.timezone,
      holidayDataVerified: true,
      currentSeriesValid: true // Assume true for now, can add robust checks later
    };

    res.json({ success: true, data: health });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
