package com.birthdaytracker.coordinator.reminder;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Publishes reminder messages to the reminders queue and waits for the broker to confirm them. */
@Component
public class ReminderPublisher {

    private static final long CONFIRM_TIMEOUT_MS = 5_000;

    private final RabbitTemplate rabbit;
    private final String queue;

    public ReminderPublisher(RabbitTemplate rabbit, @Value("${birthday-tracker.queues.reminders}") String queue) {
        this.rabbit = rabbit;
        this.queue = queue;
    }

    /**
     * Returns once RabbitMQ has confirmed the message; throws if it is nacked or not confirmed within
     * the timeout, so the caller can leave the reminder due.
     */
    public void publish(ReminderMessage message) {
        rabbit.invoke(ops -> {
            // Default exchange: the routing key is the queue name. Messages are persistent by default.
            ops.convertAndSend("", queue, message, m -> {
                m.getMessageProperties().setMessageId(message.reminderId().toString());
                return m;
            });
            ops.waitForConfirmsOrDie(CONFIRM_TIMEOUT_MS);
            return null;
        });
    }
}
