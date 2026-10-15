export interface BirthdaySubmission {
  name: string;
  birthDate: string;
  reminderWindowDays: number;
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

export async function submitBirthday(submission: BirthdaySubmission): Promise<{ id: string }> {
  const response = await fetch('/api/birthdays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(body?.message ?? `Request failed with status ${response.status}`, response.status, body?.details);
  }
  return body;
}
