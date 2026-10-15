package com.birthdaytracker.coordinator.birthday;

import java.time.LocalDate;
import java.util.UUID;

/** A stored birthday, as the reminder job reads it. */
public record Birthday(
        UUID id,
        String name,
        LocalDate birthDate,
        int reminderWindowDays,
        String reminderEmail) {
}
