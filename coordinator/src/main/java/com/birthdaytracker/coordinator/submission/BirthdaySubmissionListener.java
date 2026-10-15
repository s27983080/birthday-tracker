package com.birthdaytracker.coordinator.submission;

import com.birthdaytracker.coordinator.birthday.BirthdayRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Consumes birthday submissions from the API and stores them. */
@Component
public class BirthdaySubmissionListener {

    private static final Logger log = LoggerFactory.getLogger(BirthdaySubmissionListener.class);

    private final BirthdayRepository birthdays;

    public BirthdaySubmissionListener(BirthdayRepository birthdays) {
        this.birthdays = birthdays;
    }

    @RabbitListener(queues = "${birthday-tracker.queues.submissions}")
    public void onSubmission(BirthdaySubmission submission) {
        boolean inserted = birthdays.insertIfAbsent(
                submission.id(), submission.name(), submission.birthDate(), submission.reminderWindowDays());

        if (inserted) {
            log.info("Stored birthday {}", submission.id());
        } else {
            log.info("Ignored duplicate birthday submission {}", submission.id());
        }
    }
}
