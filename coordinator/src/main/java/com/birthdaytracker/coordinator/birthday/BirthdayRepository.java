package com.birthdaytracker.coordinator.birthday;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class BirthdayRepository {

    private final JdbcClient jdbc;

    public BirthdayRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Inserts a birthday unless one with the same id already exists, so a redelivered submission
     * message is a no-op.
     *
     * @return {@code true} if a row was inserted, {@code false} if the id was already present
     */
    public boolean insertIfAbsent(
            UUID id, String name, LocalDate birthDate, int reminderWindowDays, LocalDate nextReminderOn) {
        int rows = jdbc.sql("""
                        INSERT INTO birthdays (id, name, birth_date, reminder_window_days, next_reminder_on)
                        VALUES (:id, :name, :birthDate, :reminderWindowDays, :nextReminderOn)
                        ON CONFLICT (id) DO NOTHING
                        """)
                .param("id", id)
                .param("name", name)
                .param("birthDate", birthDate)
                .param("reminderWindowDays", reminderWindowDays)
                .param("nextReminderOn", nextReminderOn)
                .update();
        return rows == 1;
    }
}
