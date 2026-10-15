export interface BirthdaySubmission {
  name: string;
  birthDate: string;
  reminderWindowDays: number;
}

export interface Birthday extends BirthdaySubmission {
  id: string;
}

export interface FieldError {
  field: string;
  message: string;
}

/** A failed API call. `details` holds per-field messages when the API rejected the input (400). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(body?.message ?? `Request failed with status ${response.status}`, response.status, body?.details);
  }
  return body;
}

export async function submitBirthday(submission: BirthdaySubmission): Promise<{ id: string }> {
  return request('/birthdays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
}

/** All stored birthdays, most recently added first. */
export async function listBirthdays(): Promise<Birthday[]> {
  const { birthdays } = await request<{ birthdays: Birthday[] }>('/birthdays');
  return birthdays;
}
