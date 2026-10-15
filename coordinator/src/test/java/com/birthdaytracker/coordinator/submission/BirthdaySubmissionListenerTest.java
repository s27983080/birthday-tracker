package com.birthdaytracker.coordinator.submission;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.birthdaytracker.coordinator.birthday.BirthdayRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BirthdaySubmissionListenerTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-14T12:00:00Z"), ZoneOffset.UTC);

    private final BirthdayRepository repository = mock(BirthdayRepository.class);
    private final BirthdaySubmissionListener listener = new BirthdaySubmissionListener(repository, CLOCK);

    @Test
    void storesSubmissionWithNextReminderDate() {
        UUID id = UUID.fromString("0199e3a0-0000-7000-8000-000000000001");
        LocalDate birthDate = LocalDate.parse("1815-12-10");
        when(repository.insertIfAbsent(id, "Ada Lovelace", birthDate, 7, LocalDate.parse("2026-12-03")))
                .thenReturn(true);

        listener.onSubmission(new BirthdaySubmission(id, "Ada Lovelace", birthDate, 7, Instant.now(CLOCK)));

        verify(repository).insertIfAbsent(id, "Ada Lovelace", birthDate, 7, LocalDate.parse("2026-12-03"));
    }

    @Test
    void duplicateSubmissionIsNotAnError() {
        UUID id = UUID.fromString("0199e3a0-0000-7000-8000-000000000002");
        LocalDate birthDate = LocalDate.parse("1990-01-03");
        when(repository.insertIfAbsent(id, "Grace", birthDate, 7, LocalDate.parse("2026-12-27")))
                .thenReturn(false);

        listener.onSubmission(new BirthdaySubmission(id, "Grace", birthDate, 7, Instant.now(CLOCK)));

        verify(repository).insertIfAbsent(id, "Grace", birthDate, 7, LocalDate.parse("2026-12-27"));
    }
}
