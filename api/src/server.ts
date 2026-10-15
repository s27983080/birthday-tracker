import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { createPgBirthdayRepository } from './db.js';
import { createAmqpPublisher } from './queue.js';

/** Reads a variable that has no safe default (it carries credentials); exits if it's unset. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} must be set`);
    process.exit(1);
  }
  return value;
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const databaseUrl = requireEnv('DATABASE_URL');
const rabbitmqUrl = requireEnv('RABBITMQ_URL');
const submissionsQueue = process.env.SUBMISSIONS_QUEUE ?? 'birthday.submissions';

let app: FastifyInstance | undefined;

try {
  const publisher = await createAmqpPublisher({
    url: rabbitmqUrl,
    queue: submissionsQueue,
    onError: (err) => app?.log.error({ err }, 'RabbitMQ error'),
  });
  const repository = createPgBirthdayRepository(databaseUrl);
  app = buildApp({ logger: true, publisher, repository });
  app.addHook('onClose', () => publisher.close());
  app.addHook('onClose', () => repository.close());

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      await app?.close();
      process.exit(0);
    });
  }

  await app.listen({ port, host });
} catch (err) {
  if (app) app.log.error(err);
  else console.error(err);
  process.exit(1);
}
