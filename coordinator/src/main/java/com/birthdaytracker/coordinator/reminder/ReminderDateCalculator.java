package com.birthdaytracker.coordinator.reminder;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Optional;

/** Works out when a birthday's reminder is due. */
public final class ReminderDateCalculator {

    private ReminderDateCalculator() {
    }

    /**
     * Returns the birthday's next occurrence on or after {@code today}. February 29 birthdays occur on
     * February 28 in non-leap years.
     */
    public static LocalDate nextOccurrence(LocalDate birthDate, LocalDate today) {
        MonthDay birthday = MonthDay.from(birthDate);
        // MonthDay.atYear moves Feb 29 to Feb 28 in non-leap years.
        LocalDate thisYear = birthday.atYear(today.getYear());
        return thisYear.isBefore(today) ? birthday.atYear(today.getYear() + 1) : thisYear;
    }

    /**
     * Returns the upcoming birthday a reminder is due for, if {@code today} falls inside its reminder
     * window: from {@code reminderWindowDays} before the birthday up to and including the birthday.
     *
     * <p>Treating the whole window as due, not just its first day, means a run that missed a few days
     * still sends the reminder. Once the birthday has passed, the next occurrence is a year away, so a
     * reminder whose entire window was missed is never sent late.
     */
    public static Optional<LocalDate> dueBirthday(LocalDate birthDate, int reminderWindowDays, LocalDate today) {
        LocalDate birthdayOn = nextOccurrence(birthDate, today);
        boolean inWindow = !today.isBefore(birthdayOn.minusDays(reminderWindowDays));
        return inWindow ? Optional.of(birthdayOn) : Optional.empty();
    }
}
