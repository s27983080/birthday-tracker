import amqp, { type ChannelModel, type ConfirmChannel, type RecoveringChannelModel } from 'amqplib';

/** Message published to the submissions queue and consumed by the Coordinator. */
export interface BirthdaySubmissionMessage {
  id: string;
  name: string;
  birthDate: string;
  reminderWindowDays: number;
  submittedAt: string;
}

export interface SubmissionPublisher {
  /** Resolves once the broker has confirmed the message; rejects otherwise. */
  publish(message: BirthdaySubmissionMessage): Promise<void>;
  close(): Promise<void>;
}

/**
 * Queue arguments shared with the Coordinator. RabbitMQ rejects a declaration whose arguments differ
 * from the existing queue's, so keep these in sync with the Coordinator's RabbitConfig.
 */
export function submissionsQueueArguments(queue: string): Record<string, string> {
  return {
    'x-dead-letter-exchange': '',
    'x-dead-letter-routing-key': `${queue}.dlq`,
  };
}

export interface AmqpPublisherOptions {
  url: string;
  queue: string;
  /** How long to wait for a connection and broker confirm before failing the publish. */
  publishTimeoutMs?: number;
  onError?: (err: unknown) => void;
}

export async function createAmqpPublisher(options: AmqpPublisherOptions): Promise<SubmissionPublisher> {
  const { url, queue, publishTimeoutMs = 5000, onError } = options;

  const connection: RecoveringChannelModel = await amqp.connect(url, {
    recovery: {
      initialDelay: 500,
      maxDelay: 10_000,
      // Fail startup if the broker never comes up; once connected, keep reconnecting.
      initialMaxRetries: 10,
      maxRetries: Infinity,
      async setup(model: ChannelModel) {
        const channel = await model.createChannel();
        await channel.assertQueue(`${queue}.dlq`, { durable: true });
        await channel.assertQueue(queue, { durable: true, arguments: submissionsQueueArguments(queue) });
        await channel.close();
      },
    },
  });
  connection.on('error', (err) => onError?.(err));

  // One confirm channel, recreated lazily after it closes (e.g. on reconnect).
  let channel: Promise<ConfirmChannel> | undefined;
  function getChannel(): Promise<ConfirmChannel> {
    if (!channel) {
      const created = connection.createConfirmChannel();
      const reset = () => {
        if (channel === created) channel = undefined;
      };
      channel = created;
      created.then((ch) => {
        ch.on('close', reset);
        ch.on('error', (err) => {
          reset();
          onError?.(err);
        });
      }, reset);
    }
    return channel;
  }

  async function publishConfirmed(message: BirthdaySubmissionMessage): Promise<void> {
    const ch = await getChannel();
    await new Promise<void>((resolve, reject) => {
      ch.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true, contentType: 'application/json', messageId: message.id },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  return {
    async publish(message) {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Publish not confirmed within ${publishTimeoutMs}ms`)),
          publishTimeoutMs,
        );
      });
      try {
        await Promise.race([publishConfirmed(message), timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
    async close() {
      await connection.close();
    },
  };
}
