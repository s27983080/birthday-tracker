package com.birthdaytracker.coordinator.reminder;

import com.birthdaytracker.coordinator.birthday.Birthday;
import com.birthdaytracker.coordinator.birthday.BirthdayRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionOperations;

/**
 * Daily job that publishes a reminder for every birthday whose reminder window includes today and
 * hasn't had its reminder sent yet.
 *
 * <p>Nothing about the schedule is stored on the birthday: each run works out what's due from the
 * birth date and window, and {@code reminders_sent} records what has gone out. Each reminder is
 * handled in its own transaction: record it, publish and wait for the broker's confirm, commit. A
 * publish that fails rolls the record back, so the next run retries it. A publish that succeeds
 * followed by a failed commit is sent again next run (at-least-once); {@link ReminderMessage#reminderId()}
 * lets the consumer drop the duplicate.
 */
@Component
public class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    /**
     * What one run did. {@code alreadySent} counts due reminders a previous run (or another instance)
     * had sent; {@code stoppedEarly} means a publish failed and due reminders remain.
     */
    public record Result(int sent, int alreadySent, boolean stoppedEarly) {
    }

    private final BirthdayRepository birthdays;
    private final ReminderPublisher publisher;
    private final TransactionOperations transactions;
    private final Clock clock;

    public ReminderJob(
            BirthdayRepository birthdays, ReminderPublisher publisher, TransactionOperations transactions, Clock clock) {
        this.birthdays = birthdays;
        this.publisher = publisher;
        this.transactions = transactions;
        this.clock = clock;
    }

    @Scheduled(cron = "${birthday-tracker.reminders.cron}", zone = "UTC")
    public void runDaily() {
        runOnce();
    }

    /** Catches up straight away if the Coordinator was down when the daily run was due. */
    @EventListener(ApplicationReadyEvent.class)
    public void runAtStartup() {
        runOnce();
    }

    public Result runOnce() {
        LocalDate today = LocalDate.now(clock);
        int sent = 0;
        int alreadySent = 0;

        for (Birthday birthday : birthdays.findAll()) {
            Optional<LocalDate> birthdayOn =
                    ReminderDateCalculator.dueBirthday(birthday.birthDate(), birthday.reminderWindowDays(), today);
            if (birthdayOn.isEmpty()) {
                continue;
            }

            ReminderMessage message = ReminderMessage.from(birthday, birthdayOn.get(), Instant.now(clock));
            Boolean published;
            try {
                published = transactions.execute(status -> {
                    if (!birthdays.recordReminderSent(birthday.id(), message.birthdayOn(), message.reminderId())) {
                        return false;
                    }
                    publisher.publish(message);
                    return true;
                });
            } catch (RuntimeException e) {
                // Most likely the broker or database is unavailable; trying the remaining birthdays now
                // would just fail the same way. They stay unsent and the next run picks them up.
                log.error("Reminder run for {} stopped after {} sent; remaining reminders stay due", today, sent, e);
                return new Result(sent, alreadySent, true);
            }

            if (Boolean.TRUE.equals(published)) {
                sent++;
                log.info("Published reminder {} for birthday {} on {}",
                        message.reminderId(), birthday.id(), message.birthdayOn());
            } else {
                alreadySent++;
            }
        }

        log.info("Reminder run for {} finished: {} sent, {} already sent", today, sent, alreadySent);
        return new Result(sent, alreadySent, false);
    }
}
