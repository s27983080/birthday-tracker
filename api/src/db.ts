import pg from 'pg';

/** A stored birthday, as returned by the read endpoints. */
export interface Birthday {
  id: string;
  name: string;
  /** YYYY-MM-DD. */
  birthDate: string;
  reminderWindowDays: number;
}

export interface BirthdayRepository {
  /** All birthdays, most recently added first. */
  list(): Promise<Birthday[]>;
  close(): Promise<void>;
}

export function createPgBirthdayRepository(connectionString: string): BirthdayRepository {
  const pool = new pg.Pool({ connectionString });

  return {
    async list() {
      // birth_date::text keeps the date as YYYY-MM-DD; pg would otherwise parse DATE into a JS Date
      // at local midnight, which can shift the day when serialized. created_at DESC uses its index.
      const { rows } = await pool.query<Birthday>(
        `SELECT id, name, birth_date::text AS "birthDate", reminder_window_days AS "reminderWindowDays"
           FROM birthdays
          ORDER BY created_at DESC, id DESC`,
      );
      return rows;
    },
    async close() {
      await pool.end();
    },
  };
}
