import { startOfDay, isAfter, isBefore, isEqual, getMonth, getYear, addMonths, subMonths } from 'date-fns';
import { MarketCalendarService } from './MarketCalendarService';
import prisma from '../db';
export class SeriesEngine {
    /**
     * Identifies the current active series for a given date.
     * If a series doesn't exist in DB, it determines the expected boundaries.
     */
    static async getCurrentSeries(date, calendarId = 1) {
        const targetDate = startOfDay(date);
        // First, check if there's an active series in DB that contains this date
        // Note: Series dates are inclusive of reference date up to expected expiry date
        const existingSeriesList = await prisma.series.findMany({
            orderBy: { referenceDate: 'desc' },
        });
        for (const s of existingSeriesList) {
            if ((isAfter(targetDate, s.referenceDate) || isEqual(targetDate, s.referenceDate)) &&
                (isBefore(targetDate, s.expectedExpiryDate) || isEqual(targetDate, s.expectedExpiryDate))) {
                return s;
            }
        }
        // If no series found in DB, calculate boundaries based on market rules
        const year = getYear(targetDate);
        const month = getMonth(targetDate);
        // Get this month's expiry
        const currentMonthExpiry = await MarketCalendarService.getExpiryDateForMonth(year, month, calendarId);
        let referenceDate;
        let expectedExpiryDate;
        let rawPrevExpiry;
        if (isAfter(targetDate, currentMonthExpiry)) {
            // Date is past this month's expiry, so it belongs to next month's series
            rawPrevExpiry = currentMonthExpiry;
            const nextMonthDate = addMonths(targetDate, 1);
            expectedExpiryDate = await MarketCalendarService.getExpiryDateForMonth(getYear(nextMonthDate), getMonth(nextMonthDate), calendarId);
        }
        else {
            // Date is before or on this month's expiry, so it belongs to current month's series
            const prevMonthDate = subMonths(targetDate, 1);
            rawPrevExpiry = await MarketCalendarService.getExpiryDateForMonth(getYear(prevMonthDate), getMonth(prevMonthDate), calendarId);
            expectedExpiryDate = currentMonthExpiry;
        }
        referenceDate = rawPrevExpiry;
        return {
            referenceDate,
            expectedExpiryDate,
            isFinalized: false
        };
    }
}
