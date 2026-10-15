package com.birthdaytracker.coordinator.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the submissions queue and its dead-letter queue, and the reminders queue. The Backend API
 * declares the same submissions queue (see api/src/queue.ts); RabbitMQ rejects a declaration whose
 * arguments differ, so keep them in sync.
 */
@Configuration
public class RabbitConfig {

    @Bean
    Queue submissionsQueue(@Value("${birthday-tracker.queues.submissions}") String name) {
        return QueueBuilder.durable(name)
                .deadLetterExchange("")
                .deadLetterRoutingKey(name + ".dlq")
                .build();
    }

    @Bean
    Queue submissionsDeadLetterQueue(@Value("${birthday-tracker.queues.submissions}") String name) {
        return QueueBuilder.durable(name + ".dlq").build();
    }

    /**
     * Read by the email team's service. No dead-letter arguments: what to do with reminders it can't
     * process is that team's policy, and adding arguments later would need the queue recreated.
     */
    @Bean
    Queue remindersQueue(@Value("${birthday-tracker.queues.reminders}") String name) {
        return QueueBuilder.durable(name).build();
    }

    /** Uses Spring Boot's ObjectMapper, which already handles java.time types as ISO strings. */
    @Bean
    MessageConverter jsonMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
