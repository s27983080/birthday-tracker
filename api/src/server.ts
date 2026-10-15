import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { createAmqpPublisher } from './queue.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const rabbitmqUrl = process.env.RABBITMQ_URL ?? 'amqp://birthday:birthday@localhost:5672';
const submissionsQueue = process.env.SUBMISSIONS_QUEUE ?? 'birthday.submissions';

let app: FastifyInstance | undefined;

try {
  const publisher = await createAmqpPublisher({
    url: rabbitmqUrl,
    queue: submissionsQueue,
    onError: (err) => app?.log.error({ err }, 'RabbitMQ error'),
  });
  app = buildApp({ logger: true, publisher });
  app.addHook('onClose', () => publisher.close());

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
