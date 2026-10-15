import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { FakePublisher } from './fakes.js';

const NOW = new Date('2026-10-14T12:00:00Z');
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const valid = { name: 'Ada Lovelace', birthDate: '1815-12-10', reminderWindowDays: 7 };

describe('POST /birthdays', () => {
  let publisher: FakePublisher;
  let app: FastifyInstance;

  beforeEach(() => {
    publisher = new FakePublisher();
    app = buildApp({ publisher, now: () => NOW });
  });

  afterEach(() => app.close());

  const post = (payload: unknown) => app.inject({ method: 'POST', url: '/birthdays', payload: payload as object });

  it('publishes a valid submission and returns 202 with a UUIDv7', async () => {
    const response = await post({ ...valid, name: '  Ada Lovelace  ' });

    expect(response.statusCode).toBe(202);
    const { id } = response.json();
    expect(id).toMatch(UUID_V7);
    expect(publisher.published).toEqual([
      {
        id,
        name: 'Ada Lovelace',
        birthDate: '1815-12-10',
        reminderWindowDays: 7,
        submittedAt: NOW.toISOString(),
      },
    ]);
  });

  it.each([1, 14])('accepts a reminder window of %i days', async (reminderWindowDays) => {
    const response = await post({ ...valid, reminderWindowDays });

    expect(response.statusCode).toBe(202);
  });

  it('accepts a birth date of today', async () => {
    const response = await post({ ...valid, birthDate: '2026-10-14' });

    expect(response.statusCode).toBe(202);
  });

  it('accepts a name of exactly 200 characters', async () => {
    const response = await post({ ...valid, name: 'a'.repeat(200) });

    expect(response.statusCode).toBe(202);
  });

  it('reports every missing field', async () => {
    const response = await post({});

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'ValidationError' });
    expect(response.json().details).toEqual(
      expect.arrayContaining([
        { field: 'name', message: 'is required' },
        { field: 'birthDate', message: 'is required' },
        { field: 'reminderWindowDays', message: 'is required' },
      ]),
    );
    expect(publisher.published).toHaveLength(0);
  });

  it.each([
    ['empty name', { name: '' }, 'name'],
    ['whitespace-only name', { name: '   ' }, 'name'],
    ['name over 200 characters', { name: 'a'.repeat(201) }, 'name'],
    ['non-string name', { name: 42 }, 'name'],
    ['malformed date', { birthDate: '10/12/1815' }, 'birthDate'],
    ['impossible date', { birthDate: '2023-02-30' }, 'birthDate'],
    ['future date', { birthDate: '2026-10-15' }, 'birthDate'],
    ['window of 0', { reminderWindowDays: 0 }, 'reminderWindowDays'],
    ['window of 15', { reminderWindowDays: 15 }, 'reminderWindowDays'],
    ['fractional window', { reminderWindowDays: 1.5 }, 'reminderWindowDays'],
    ['string window', { reminderWindowDays: '7' }, 'reminderWindowDays'],
    ['null window', { reminderWindowDays: null }, 'reminderWindowDays'],
  ])('rejects a %s', async (_label, override, field) => {
    const response = await post({ ...valid, ...override });

    expect(response.statusCode).toBe(400);
    expect(response.json().details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
    expect(publisher.published).toHaveLength(0);
  });

  it('rejects unknown fields', async () => {
    const response = await post({ ...valid, admin: true });

    expect(response.statusCode).toBe(400);
    expect(response.json().details).toEqual([{ field: 'admin', message: 'is not allowed' }]);
  });

  it('returns 503 when the submission cannot be published', async () => {
    publisher.failWith = new Error('broker unavailable');

    const response = await post(valid);

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: 'ServiceUnavailable' });
  });
});
