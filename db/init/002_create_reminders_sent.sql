-- One row per reminder the Coordinator's daily job has published. The job works out which birthdays
-- are inside their reminder window from birthdays alone; this table is how it knows a reminder was
-- already sent, so reruns, catch-up runs and several Coordinator instances never send one twice.

CREATE TABLE IF NOT EXISTS reminders_sent (
    birthday_id  UUID        NOT NULL REFERENCES birthdays (id) ON DELETE CASCADE,
    -- The birthday occurrence the reminder was for (Feb 29 birthdays fall on Feb 28 in non-leap
    -- years). Keyed on the occurrence rather than the reminder date, so changing a birthday's window
    -- after its reminder went out doesn't send a second one for the same birthday.
    birthday_on  DATE        NOT NULL,
    -- Sent as the message's reminderId so the email service can drop a duplicate delivery.
    reminder_id  UUID        NOT NULL UNIQUE,
    sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (birthday_id, birthday_on)
);
