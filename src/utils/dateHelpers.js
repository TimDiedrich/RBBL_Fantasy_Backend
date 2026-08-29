/**
 * Calculates start and end timestamps for a given fantasy week.
 * 
 * @param {number} weekId - The fantasy week number (1, 2, 3...)
 * @param {string|Date} seasonStartDate - Opening day of Week 1 (default: '2026-08-04')
 * @param {number} daysPerWeek - Duration of a match week in days (default: 7)
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getWeekDateRange(weekId, seasonStartDate = '2026-08-04T00:00:00Z', daysPerWeek = 7) {
    if (weekId < 1 || !Number.isInteger(weekId)) {
        throw new Error('week_id must be a positive integer.');
    }

    const seasonStart = new Date(seasonStart);

    const startOffsetDays = (weekId - 1) * daysPerWeek;

    const startDate = new Date(startDate.getDate() + startOffsetDays);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysPerWeek);

    return { startDate, endDate };
}

module.exports = { getWeekDateRange };