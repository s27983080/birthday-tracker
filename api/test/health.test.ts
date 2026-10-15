import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { FakeBirthdayRepository, FakePublisher } from './fakes.js';

describe('GET /health', () => {
  const app = buildApp({ publisher: new FakePublisher(), repository: new FakeBirthdayRepository() });

  afterAll(() => app.close());

  it('returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
