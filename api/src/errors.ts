import type { FastifyError, FastifyInstance } from 'fastify';

export interface FieldError {
  field: string;
  message: string;
}

/** Thrown by handlers for value rules JSON schema can't express; rendered like schema errors. */
export class ValidationError extends Error {
  constructor(readonly details: FieldError[]) {
    super(details.map((d) => `${d.field} ${d.message}`).join(', '));
    this.name = 'ValidationError';
  }
}

type SchemaError = NonNullable<FastifyError['validation']>[number];

function toFieldError(error: SchemaError): FieldError {
  // Missing and unknown properties are reported on the parent object, with the name in params.
  if (error.keyword === 'required') {
    return { field: String(error.params.missingProperty), message: 'is required' };
  }
  if (error.keyword === 'additionalProperties') {
    return { field: String(error.params.additionalProperty), message: 'is not allowed' };
  }
  const field = error.instancePath.replace(/^\//, '').replaceAll('/', '.') || 'body';
  return { field, message: error.message ?? 'is invalid' };
}

/** Renders validation failures as 400 { error, message, details: [{ field, message }] }. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError | ValidationError>((error, request, reply) => {
    const details =
      error instanceof ValidationError
        ? error.details
        : error.validation
          ? error.validation.map(toFieldError)
          : undefined;

    if (details) {
      // ValidationError is only thrown for body rules; schema errors say which part of the request failed.
      const part = !(error instanceof ValidationError) && error.validationContext === 'params' ? 'path' : 'body';
      return reply.code(400).send({ error: 'ValidationError', message: `Request ${part} is invalid`, details });
    }

    const statusCode = (error as FastifyError).statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'request failed');
      return reply.code(statusCode).send({ error: 'InternalServerError', message: 'Something went wrong' });
    }
    return reply.code(statusCode).send({ error: error.name, message: error.message });
  });
}
