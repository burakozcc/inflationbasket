export type DateRange = '1W' | '1M' | '3M' | '1Y' | 'YTD' | 'ALL';

export const getDateRangeWindow = (range: DateRange, endDate: Date = new Date()): { startDate: Date; endDate: Date } => {
    const start = new Date(endDate);
    
    // Ensure endDate is end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    switch (range) {
        case '1W':
            start.setDate(end.getDate() - 7);
            break;
        case '1M':
            start.setMonth(end.getMonth() - 1);
            break;
        case '3M':
            start.setMonth(end.getMonth() - 3);
            break;
        case '1Y':
            start.setFullYear(end.getFullYear() - 1);
            break;
        case 'YTD':
            start.setMonth(0, 1); // Jan 1st
            start.setFullYear(end.getFullYear());
            break;
        case 'ALL':
            return { startDate: new Date(0), endDate: end };
    }
    
    // Ensure start is beginning of the day
    start.setHours(0, 0, 0, 0);
    
    return { startDate: start, endDate: end };
};