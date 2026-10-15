import type { Birthday, BirthdayRepository } from '../src/db.js';
import type { BirthdaySubmissionMessage, SubmissionPublisher } from '../src/queue.js';

/** In-memory publisher for route tests; set `failWith` to simulate a broker failure. */
export class FakePublisher implements SubmissionPublisher {
  readonly published: BirthdaySubmissionMessage[] = [];
  failWith: Error | undefined;

  async publish(message: BirthdaySubmissionMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.published.push(message);
  }

  async close(): Promise<void> {}
}

/** In-memory repository for route tests; set `failWith` to simulate a database failure. */
export class FakeBirthdayRepository implements BirthdayRepository {
  birthdays: Birthday[] = [];
  failWith: Error | undefined;

  async list(): Promise<Birthday[]> {
    if (this.failWith) throw this.failWith;
    return this.birthdays;
  }

  async get(id: string): Promise<Birthday | undefined> {
    if (this.failWith) throw this.failWith;
    return this.birthdays.find((b) => b.id === id);
  }

  async close(): Promise<void> {}
}
