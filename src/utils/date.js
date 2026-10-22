/**
 * Date and Time Utilities for Local Business Operations
 * Dates stored in SQLite as ISO YYYY-MM-DD or full ISO strings for exact timestamps.
 */

/**
 * Get today's date formatted as YYYY-MM-DD
 * @returns {string}
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current UTC ISO timestamp string
 * @returns {string}
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Format a YYYY-MM-DD or ISO date string into human-readable local date
 * @param {string} dateStr
 * @param {boolean} [includeTime=false]
 * @returns {string}
 */
export function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }

    return d.toLocaleDateString('en-US', options);
  } catch (err) {
    return dateStr;
  }
}

/**
 * Format timestamp into display time, e.g. "02:30 PM"
 * @param {string} timestampStr
 * @returns {string}
 */
export function formatTime(timestampStr) {
  if (!timestampStr) return '';
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Get start and end date strings for predefined report ranges
 * @param {'today'|'yesterday'|'this_week'|'this_month'|'last_month'|'this_year'|'all'} rangeKey
 * @returns {{ startDate: string, endDate: string }}
 */
export function getDateRange(rangeKey) {
  const now = new Date();
  const today = getTodayDateString();

  if (rangeKey === 'today') {
    return { startDate: today, endDate: today };
  }

  if (rangeKey === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    return { startDate: yStr, endDate: yStr };
  }

  if (rangeKey === 'this_week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);
    const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    return { startDate: startStr, endDate: today };
  }

  if (rangeKey === 'this_month') {
    const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return { startDate: startStr, endDate: today };
  }

  if (rangeKey === 'last_month') {
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = `${firstDayLastMonth.getFullYear()}-${String(firstDayLastMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${lastDayLastMonth.getFullYear()}-${String(lastDayLastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayLastMonth.getDate()).padStart(2, '0')}`;
    return { startDate: startStr, endDate: endStr };
  }

  if (rangeKey === 'this_year') {
    const startStr = `${now.getFullYear()}-01-01`;
    return { startDate: startStr, endDate: today };
  }

  // 'all'
  return { startDate: '1970-01-01', endDate: '2099-12-31' };
}
