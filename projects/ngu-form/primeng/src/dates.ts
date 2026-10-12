/** The calendar day of a model date: midnight UTC as stored, or the local day of a time. */
function calendarDay(d: Date): [number, number, number] {
  const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return utcMidnight ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] : [d.getFullYear(), d.getMonth(), d.getDate()];
}

/** A model date (`Date` or ISO string) as the local-midnight `Date` PrimeNG's datepicker shows. */
export function toLocal(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN((value as Date).getTime())) {
    const [y, m, d] = calendarDay(value as Date);
    return new Date(y, m, d);
  }
  return null;
}

/** A picked local date as the model stores it: midnight UTC, or an ISO string. */
export function fromLocal(picked: unknown, asString: boolean): Date | string | null {
  if (!(picked instanceof Date) || Number.isNaN(picked.getTime())) {
    return asString ? '' : null;
  }
  const y = picked.getFullYear();
  const m = picked.getMonth();
  const d = picked.getDate();
  return asString
    ? `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    : new Date(Date.UTC(y, m, d));
}
