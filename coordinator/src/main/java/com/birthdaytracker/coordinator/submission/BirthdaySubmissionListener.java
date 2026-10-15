package com.birthdaytracker.coordinator.submission;

import com.birthdaytracker.coordinator.birthday.BirthdayRepository;
import com.birthdaytracker.coordinator.reminder.ReminderDateCalculator;
import java.time.Clock;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Consumes birthday submissions from the API and stores them with their first reminder date. */
@Component
public class BirthdaySubmissionListener {

    private static final Logger log = LoggerFactory.getLogger(BirthdaySubmissionListener.class);

    private final BirthdayRepository birthdays;
    private final Clock clock;

    public BirthdaySubmissionListener(BirthdayRepository birthdays, Clock clock) {
        this.birthdays = birthdays;
        this.clock = clock;
    }

    @RabbitListener(queues = "${birthday-tracker.queues.submissions}")
    public void onSubmission(BirthdaySubmission submission) {
        LocalDate nextReminderOn = ReminderDateCalculator.nextReminderOn(
                submission.birthDate(), submission.reminderWindowDays(), LocalDate.now(clock));

        boolean inserted = birthdays.insertIfAbsent(
                submission.id(),
                submission.name(),
                submission.birthDate(),
                submission.reminderWindowDays(),
                nextReminderOn);

        if (inserted) {
            log.info("Stored birthday {} with next reminder on {}", submission.id(), nextReminderOn);
        } else {
            log.info("Ignored duplicate birthday submission {}", submission.id());
        }
    }
}
