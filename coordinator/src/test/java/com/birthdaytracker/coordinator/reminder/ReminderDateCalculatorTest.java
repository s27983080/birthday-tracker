package com.birthdaytracker.coordinator.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ReminderDateCalculatorTest {

    @ParameterizedTest(name = "born {0}, today {1} -> {2}")
    @CsvSource({
            // Later this year
            "1990-12-10, 2026-10-14, 2026-12-10",
            // Today
            "1990-10-14, 2026-10-14, 2026-10-14",
            // Already passed this year
            "1990-03-01, 2026-10-14, 2027-03-01",
            // Feb 29: Feb 28 in non-leap years, Feb 29 in leap years
            "2000-02-29, 2026-10-14, 2027-02-28",
            "2000-02-29, 2027-10-14, 2028-02-29",
            "2000-02-29, 2027-02-28, 2027-02-28",
            // Born today
            "2026-10-14, 2026-10-14, 2026-10-14",
    })
    void computesNextOccurrence(LocalDate birthDate, LocalDate today, LocalDate expected) {
        assertThat(ReminderDateCalculator.nextOccurrence(birthDate, today)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "born {0}, window {1}, today {2} -> due for {3}")
    @CsvSource({
            // First day of the window
            "1990-12-10, 7, 2026-12-03, 2026-12-10",
            // Middle of the window (a run that missed a few days still sends)
            "1990-12-10, 7, 2026-12-06, 2026-12-10",
            // Birthday itself is the last day of the window
            "1990-12-10, 7, 2026-12-10, 2026-12-10",
            // Window boundaries
            "1990-12-10, 1, 2026-12-09, 2026-12-10",
            "1990-12-10, 14, 2026-11-26, 2026-12-10",
            // Window crosses the year end
            "1990-01-03, 7, 2026-12-27, 2027-01-03",
            // Feb 29 in a non-leap year: window counts back from Feb 28
            "2000-02-29, 7, 2027-02-21, 2027-02-28",
    })
    void isDueInsideTheWindow(LocalDate birthDate, int window, LocalDate today, LocalDate birthdayOn) {
        assertThat(ReminderDateCalculator.dueBirthday(birthDate, window, today)).contains(birthdayOn);
    }

    @ParameterizedTest(name = "born {0}, window {1}, today {2} -> not due")
    @CsvSource({
            // Day before the window opens
            "1990-12-10, 7, 2026-12-02",
            "1990-01-03, 7, 2026-12-26",
            "2000-02-29, 7, 2027-02-20",
            // Day after the birthday: next occurrence is a year away
            "1990-12-10, 7, 2026-12-11",
    })
    void isNotDueOutsideTheWindow(LocalDate birthDate, int window, LocalDate today) {
        assertThat(ReminderDateCalculator.dueBirthday(birthDate, window, today)).isEmpty();
    }
}
