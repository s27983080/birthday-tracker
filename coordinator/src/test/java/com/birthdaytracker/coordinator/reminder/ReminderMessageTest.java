package com.birthdaytracker.coordinator.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import com.birthdaytracker.coordinator.birthday.Birthday;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ReminderMessageTest {

    private static final UUID ADA = UUID.fromString("0199e3a0-0000-7000-8000-000000000001");
    private static final UUID GRACE = UUID.fromString("0199e3a0-0000-7000-8000-000000000002");

    @Test
    void reminderIdIsTheSameForTheSameBirthdayOccurrence() {
        LocalDate birthdayOn = LocalDate.parse("2026-12-10");

        assertThat(ReminderMessage.reminderId(ADA, birthdayOn)).isEqualTo(ReminderMessage.reminderId(ADA, birthdayOn));
    }

    @Test
    void reminderIdDiffersAcrossYearsAndBirthdays() {
        UUID ada2026 = ReminderMessage.reminderId(ADA, LocalDate.parse("2026-12-10"));

        assertThat(ReminderMessage.reminderId(ADA, LocalDate.parse("2027-12-10"))).isNotEqualTo(ada2026);
        assertThat(ReminderMessage.reminderId(GRACE, LocalDate.parse("2026-12-10"))).isNotEqualTo(ada2026);
    }

    @Test
    void copiesTheBirthdayIntoTheMessage() {
        Birthday birthday = new Birthday(ADA, "Ada Lovelace", LocalDate.parse("1815-12-10"), 7, "ada@example.com");
        Instant now = Instant.parse("2026-12-03T06:00:00Z");

        ReminderMessage message = ReminderMessage.from(birthday, LocalDate.parse("2026-12-10"), now);

        assertThat(message).isEqualTo(new ReminderMessage(
                ReminderMessage.reminderId(ADA, LocalDate.parse("2026-12-10")),
                ADA,
                "Ada Lovelace",
                LocalDate.parse("1815-12-10"),
                LocalDate.parse("2026-12-10"),
                7,
                "ada@example.com",
                now));
    }
}
