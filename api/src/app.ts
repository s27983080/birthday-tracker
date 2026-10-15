import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandler } from './errors.js';
import type { SubmissionPublisher } from './queue.js';
import { birthdayRoutes } from './routes/birthdays.js';

export interface AppOptions extends FastifyServerOptions {
  publisher: SubmissionPublisher;
  now?: () => Date;
}

export function buildApp({ publisher, now, ...options }: AppOptions): FastifyInstance {
  const app = Fastify({
    ...options,
    ajv: {
      customOptions: {
        // Report every invalid field at once, not just the first.
        allErrors: true,
        // Fastify's defaults coerce "7" to 7 and silently strip unknown properties; for a JSON API
        // we'd rather reject both so clients find out about mistakes.
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(birthdayRoutes, { publisher, now });

  return app;
}
