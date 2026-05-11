import { store } from '../db/store.js';

export class EconomicCalendarService {
  list({ country, importance, category } = {}) {
    return store.economicCalendar
      .filter((event) => !country || event.country === country)
      .filter((event) => !importance || String(event.importance).toLowerCase() === String(importance).toLowerCase())
      .filter((event) => !category || event.category === category)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  highImportance() {
    return this.list().filter((event) => ['high', '3'].includes(String(event.importance).toLowerCase()));
  }
}

export const economicCalendarService = new EconomicCalendarService();

