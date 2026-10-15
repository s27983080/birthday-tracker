package com.birthdaytracker.coordinator.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ReminderDateCalculatorTest {

    @ParameterizedTest(name = "born {0}, window {1}, today {2} -> {3}")
    @CsvSource({
            // Reminder still ahead this year
            "1990-12-10, 7, 2026-10-14, 2026-12-03",
            // Reminder is today
            "1990-10-21, 7, 2026-10-14, 2026-10-14",
            // Reminder passed yesterday but the birthday is still upcoming -> next year's reminder
            "1990-10-20, 7, 2026-10-14, 2027-10-13",
            // Birthday is today -> next year's reminder
            "1990-10-14, 1, 2026-10-14, 2027-10-13",
            // Birthday already passed this year
            "1990-03-01, 7, 2026-10-14, 2027-02-22",
            // Window boundaries
            "1990-12-10, 1, 2026-10-14, 2026-12-09",
            "1990-12-10, 14, 2026-10-14, 2026-11-26",
            // Reminder falls in the year before the birthday
            "1990-01-03, 7, 2026-10-14, 2026-12-27",
            "1990-01-03, 7, 2026-12-28, 2027-12-27",
            // Feb 29 birthday: Feb 28 in non-leap years, Feb 29 in leap years
            "2000-02-29, 7, 2026-10-14, 2027-02-21",
            "2000-02-29, 7, 2027-10-14, 2028-02-22",
            // Born today
            "2026-10-14, 7, 2026-10-14, 2027-10-07",
    })
    void computesNextReminderOn(LocalDate birthDate, int window, LocalDate today, LocalDate expected) {
        assertThat(ReminderDateCalculator.nextReminderOn(birthDate, window, today)).isEqualTo(expected);
    }
}
