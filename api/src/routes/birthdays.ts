import type { FastifyPluginAsync } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { ValidationError, type FieldError } from '../errors.js';
import type { SubmissionPublisher } from '../queue.js';

export const NAME_MAX_LENGTH = 200;
export const REMINDER_WINDOW_MIN_DAYS = 1;
export const REMINDER_WINDOW_MAX_DAYS = 14;

interface CreateBirthdayBody {
  name: string;
  birthDate: string;
  reminderWindowDays: number;
}

const createBirthdaySchema = {
  body: {
    type: 'object',
    required: ['name', 'birthDate', 'reminderWindowDays'],
    additionalProperties: false,
    properties: {
      // maxLength matches the VARCHAR(200) column.
      name: { type: 'string', minLength: 1, maxLength: NAME_MAX_LENGTH },
      // The "date" format also rejects impossible dates such as 2023-02-30.
      birthDate: { type: 'string', format: 'date' },
      reminderWindowDays: {
        type: 'integer',
        minimum: REMINDER_WINDOW_MIN_DAYS,
        maximum: REMINDER_WINDOW_MAX_DAYS,
      },
    },
  },
  response: {
    202: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
} as const;

export interface BirthdayRoutesOptions {
  publisher: SubmissionPublisher;
  now?: () => Date;
}

export const birthdayRoutes: FastifyPluginAsync<BirthdayRoutesOptions> = async (
  app,
  { publisher, now = () => new Date() },
) => {
  app.post<{ Body: CreateBirthdayBody }>('/birthdays', { schema: createBirthdaySchema }, async (request, reply) => {
    const { birthDate, reminderWindowDays } = request.body;
    const name = request.body.name.trim();
    const submittedAt = now();

    const errors: FieldError[] = [];
    if (name.length === 0) {
      errors.push({ field: 'name', message: 'must not be blank' });
    }
    // Both are YYYY-MM-DD, so they compare lexically. "Today" is the UTC date; a user just past
    // midnight in a timezone ahead of UTC could be rejected for today's date, which is acceptable.
    if (birthDate > submittedAt.toISOString().slice(0, 10)) {
      errors.push({ field: 'birthDate', message: 'must not be in the future' });
    }
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const id = uuidv7();
    try {
      await publisher.publish({
        id,
        name,
        birthDate,
        reminderWindowDays,
        submittedAt: submittedAt.toISOString(),
      });
    } catch (err) {
      request.log.error({ err, id }, 'failed to publish birthday submission');
      return reply
        .code(503)
        .send({ error: 'ServiceUnavailable', message: 'Could not accept the birthday right now; try again later.' });
    }

    request.log.info({ id }, 'birthday submission published');
    return reply.code(202).send({ id });
  });
};
