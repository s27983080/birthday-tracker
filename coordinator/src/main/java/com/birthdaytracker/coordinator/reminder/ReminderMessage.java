package com.birthdaytracker.coordinator.reminder;

import com.birthdaytracker.coordinator.birthday.Birthday;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Published to the reminders queue for the email team's service.
 *
 * @param reminderId    the same for every publish of the reminder for one birthday occurrence, so the
 *                      consumer can drop a duplicate delivery
 * @param birthdayOn    the upcoming birthday this reminder is for (Feb 29 birthdays fall on Feb 28 in
 *                      non-leap years)
 * @param reminderEmail who to email; {@code null} until the UI collects it
 */
public record ReminderMessage(
        UUID reminderId,
        UUID birthdayId,
        String name,
        LocalDate birthDate,
        LocalDate birthdayOn,
        int reminderWindowDays,
        String reminderEmail,
        Instant publishedAt) {

    public static ReminderMessage from(Birthday birthday, LocalDate birthdayOn, Instant publishedAt) {
        return new ReminderMessage(
                reminderId(birthday.id(), birthdayOn),
                birthday.id(),
                birthday.name(),
                birthday.birthDate(),
                birthdayOn,
                birthday.reminderWindowDays(),
                birthday.reminderEmail(),
                publishedAt);
    }

    /** Name-based (v3) UUID of the birthday id and occurrence: deterministic across retries. */
    static UUID reminderId(UUID birthdayId, LocalDate birthdayOn) {
        return UUID.nameUUIDFromBytes((birthdayId + ":" + birthdayOn).getBytes(StandardCharsets.UTF_8));
    }
}
