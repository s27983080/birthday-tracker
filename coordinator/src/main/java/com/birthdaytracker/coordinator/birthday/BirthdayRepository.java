package com.birthdaytracker.coordinator.birthday;

import java.time.LocalDate;
import java.util.List;
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
    public boolean insertIfAbsent(UUID id, String name, LocalDate birthDate, int reminderWindowDays) {
        int rows = jdbc.sql("""
                        INSERT INTO birthdays (id, name, birth_date, reminder_window_days)
                        VALUES (:id, :name, :birthDate, :reminderWindowDays)
                        ON CONFLICT (id) DO NOTHING
                        """)
                .param("id", id)
                .param("name", name)
                .param("birthDate", birthDate)
                .param("reminderWindowDays", reminderWindowDays)
                .update();
        return rows == 1;
    }

    /**
     * Every birthday. The reminder job checks each one's window in Java; fine at thousands of rows.
     * At much larger scale, pre-filter in SQL to birthdays whose month and day fall in the next 14 days.
     */
    public List<Birthday> findAll() {
        return jdbc.sql("SELECT id, name, birth_date, reminder_window_days, reminder_email FROM birthdays")
                .query((rs, rowNum) -> new Birthday(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getObject("birth_date", LocalDate.class),
                        rs.getInt("reminder_window_days"),
                        rs.getString("reminder_email")))
                .list();
    }

    /**
     * Records that the reminder for one birthday occurrence is being sent. Call inside the transaction
     * that publishes it: if publishing fails, the rollback removes the record and the next run retries.
     * A concurrent insert of the same key (another Coordinator instance) waits for this transaction and
     * then conflicts.
     *
     * @return {@code true} if recorded, {@code false} if this occurrence's reminder was already sent
     */
    public boolean recordReminderSent(UUID birthdayId, LocalDate birthdayOn, UUID reminderId) {
        int rows = jdbc.sql("""
                        INSERT INTO reminders_sent (birthday_id, birthday_on, reminder_id)
                        VALUES (:birthdayId, :birthdayOn, :reminderId)
                        ON CONFLICT DO NOTHING
                        """)
                .param("birthdayId", birthdayId)
                .param("birthdayOn", birthdayOn)
                .param("reminderId", reminderId)
                .update();
        return rows == 1;
    }
}
