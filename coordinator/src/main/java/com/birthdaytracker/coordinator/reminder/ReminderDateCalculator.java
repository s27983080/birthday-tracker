package com.birthdaytracker.coordinator.reminder;

import java.time.LocalDate;
import java.time.MonthDay;

/** Works out when a birthday's reminder is due. */
public final class ReminderDateCalculator {

    private ReminderDateCalculator() {
    }

    /**
     * Returns the earliest reminder date on or after {@code today}: the birthday's occurrence in a given
     * year minus {@code reminderWindowDays}. If this year's reminder date has already passed, the next
     * reminder is next year's, even when this year's birthday is still upcoming.
     *
     * <p>February 29 birthdays occur on February 28 in non-leap years.
     */
    public static LocalDate nextReminderOn(LocalDate birthDate, int reminderWindowDays, LocalDate today) {
        MonthDay birthday = MonthDay.from(birthDate);
        // A reminder can fall in the year before its birthday (e.g. Jan 3 with a 7-day window), so
        // start from the birthday in today's year and move forward until the reminder isn't past.
        for (int year = today.getYear(); ; year++) {
            LocalDate reminder = birthday.atYear(year).minusDays(reminderWindowDays);
            if (!reminder.isBefore(today)) {
                return reminder;
            }
        }
    }
}
