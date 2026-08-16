import { getDay, lastDayOfMonth, subDays, isWeekend, startOfDay, isBefore, isEqual } from 'date-fns';
import prisma from '../db';

export class MarketCalendarService {
  /**
   * Check if a given date is an exchange holiday
   */
  static async isHoliday(date: Date, calendarId: number = 1): Promise<boolean> {
    const { toZonedTime } = require('date-fns-tz');
    const zoned = toZonedTime(date, 'Asia/Kolkata');
    const start = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()));
    
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: start,
        marketCalendarId: calendarId,
      },
    });
    return !!holiday;
  }

  /**
   * Check if a date is a valid trading session
   */
  static async isValidTradingSession(date: Date, calendarId: number = 1): Promise<boolean> {
    const { toZonedTime } = require('date-fns-tz');
    const zoned = toZonedTime(date, 'Asia/Kolkata');
    const start = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()));
    
    // First, check if there's an explicit MarketSession overriding the defaults (e.g. Special Session on weekend)
    const session = await prisma.marketSession.findFirst({
      where: { date: start, marketCalendarId: calendarId }
    });
    if (session) {
      if (session.specialSessionFlag || session.isTradingDay) return true;
      if (session.status === 'HOLIDAY' || !session.isTradingDay) return false;
    }

    if (isWeekend(date)) {
      return false;
    }
    const isHol = await this.isHoliday(date, calendarId);
    return !isHol;
  }

  /**
   * Get the previous valid trading session
   */
  static async getPreviousTradingSession(date: Date, calendarId: number = 1): Promise<Date> {
    const { toZonedTime } = require('date-fns-tz');
    
    let curr = subDays(date, 1);
    while (true) {
      if (await this.isValidTradingSession(curr, calendarId)) {
        const zoned = toZonedTime(curr, 'Asia/Kolkata');
        return new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()));
      }
      curr = subDays(curr, 1);
    }
  }

  /**
   * Get the next valid trading session
   */
  static async getNextTradingSession(date: Date, calendarId: number = 1): Promise<Date> {
    const { toZonedTime } = require('date-fns-tz');
    const zoned = toZonedTime(date, 'Asia/Kolkata');
    let current = subDays(new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())), -1); // addDays
    while (!(await this.isValidTradingSession(current, calendarId))) {
      current = subDays(current, -1);
    }
    return current;
  }

  /**
   * Generate trading sessions between two dates (inclusive of start and end if they are trading days)
   */
  static async generateTradingSessions(start: Date, end: Date, calendarId: number = 1): Promise<Date[]> {
    const sessions: Date[] = [];
    let current = startOfDay(start);
    const endDate = startOfDay(end);

    while (isBefore(current, endDate) || isEqual(current, endDate)) {
      if (await this.isValidTradingSession(current, calendarId)) {
        sessions.push(current);
      }
      current = subDays(current, -1); // add 1 day
    }
    return sessions;
  }

  /**
   * Calculate the last Tuesday of a given month
   */
  static getLastTuesdayOfMonth(year: number, month: number): Date {
    const lastDay = lastDayOfMonth(new Date(year, month));
    let current = startOfDay(lastDay);
    
    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    while (getDay(current) !== 2) {
      current = subDays(current, 1);
    }
    return current;
  }

  /**
   * Get the true expiry/reference date for a month, adjusting for holidays
   */
  static async getExpiryDateForMonth(year: number, month: number, calendarId: number = 1): Promise<Date> {
    let expiryDate = this.getLastTuesdayOfMonth(year, month);
    
    // If it's a holiday, move backwards to previous valid session
    while (!(await this.isValidTradingSession(expiryDate, calendarId))) {
      expiryDate = await this.getPreviousTradingSession(expiryDate, calendarId);
    }
    
    return expiryDate;
  }
}
