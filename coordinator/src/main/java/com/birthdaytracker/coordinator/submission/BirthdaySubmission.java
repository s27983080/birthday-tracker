package com.birthdaytracker.coordinator.submission;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A validated birthday published by the Backend API to the submissions queue. */
public record BirthdaySubmission(
        UUID id,
        String name,
        LocalDate birthDate,
        int reminderWindowDays,
        Instant submittedAt) {
}
