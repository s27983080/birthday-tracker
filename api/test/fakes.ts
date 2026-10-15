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
