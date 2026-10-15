/** "1 day before", "7 days before". */
export function formatReminderWindow(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'} before`;
}

const longDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' });

/** Formats a YYYY-MM-DD date for display. Read and formatted as UTC so the day never shifts. */
export function formatBirthDate(birthDate: string): string {
  return longDate.format(new Date(`${birthDate}T00:00:00Z`));
}
