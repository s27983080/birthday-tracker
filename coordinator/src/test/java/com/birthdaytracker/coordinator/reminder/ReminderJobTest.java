package com.birthdaytracker.coordinator.reminder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.birthdaytracker.coordinator.birthday.Birthday;
import com.birthdaytracker.coordinator.birthday.BirthdayRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.AmqpException;
import org.springframework.transaction.support.TransactionOperations;

class ReminderJobTest {

    private static final Instant NOW = Instant.parse("2026-12-03T06:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private static final Birthday ADA =
            new Birthday(UUID.fromString("0199e3a0-0000-7000-8000-000000000001"), "Ada Lovelace",
                    LocalDate.parse("1815-12-10"), 7, null);
    private static final Birthday GRACE =
            new Birthday(UUID.fromString("0199e3a0-0000-7000-8000-000000000002"), "Grace Hopper",
                    LocalDate.parse("1906-12-09"), 14, null);
    /** Window opens Dec 4, so not due on Dec 3. */
    private static final Birthday ALAN =
            new Birthday(UUID.fromString("0199e3a0-0000-7000-8000-000000000003"), "Alan Turing",
                    LocalDate.parse("1912-12-11"), 7, null);
    /** Birthday was yesterday; next occurrence is a year away. */
    private static final Birthday KATHERINE =
            new Birthday(UUID.fromString("0199e3a0-0000-7000-8000-000000000004"), "Katherine Johnson",
                    LocalDate.parse("1918-12-02"), 7, null);

    private final BirthdayRepository repository = mock(BirthdayRepository.class);
    private final ReminderPublisher publisher = mock(ReminderPublisher.class);
    private final ReminderJob job =
            new ReminderJob(repository, publisher, TransactionOperations.withoutTransaction(), CLOCK);

    @BeforeEach
    void recordingSucceedsByDefault() {
        when(repository.recordReminderSent(any(), any(), any())).thenReturn(true);
    }

    @Test
    void recordsAndPublishesAReminderInsideItsWindow() {
        when(repository.findAll()).thenReturn(List.of(ADA));

        ReminderJob.Result result = job.runOnce();

        LocalDate birthdayOn = LocalDate.parse("2026-12-10");
        UUID reminderId = ReminderMessage.reminderId(ADA.id(), birthdayOn);
        verify(repository).recordReminderSent(ADA.id(), birthdayOn, reminderId);
        ArgumentCaptor<ReminderMessage> sent = ArgumentCaptor.forClass(ReminderMessage.class);
        verify(publisher).publish(sent.capture());
        assertThat(sent.getValue()).isEqualTo(new ReminderMessage(
                reminderId, ADA.id(), "Ada Lovelace", LocalDate.parse("1815-12-10"), birthdayOn, 7, null, NOW));
        assertThat(result).isEqualTo(new ReminderJob.Result(1, 0, false));
    }

    @Test
    void onlyPublishesBirthdaysWhoseWindowIncludesToday() {
        when(repository.findAll()).thenReturn(List.of(ADA, GRACE, ALAN, KATHERINE));

        ReminderJob.Result result = job.runOnce();

        ArgumentCaptor<ReminderMessage> sent = ArgumentCaptor.forClass(ReminderMessage.class);
        verify(publisher, times(2)).publish(sent.capture());
        assertThat(sent.getAllValues()).extracting(ReminderMessage::birthdayId).containsExactly(ADA.id(), GRACE.id());
        verify(repository, never()).recordReminderSent(eq(ALAN.id()), any(), any());
        verify(repository, never()).recordReminderSent(eq(KATHERINE.id()), any(), any());
        assertThat(result).isEqualTo(new ReminderJob.Result(2, 0, false));
    }

    @Test
    void doesNotPublishAReminderThatWasAlreadySent() {
        when(repository.findAll()).thenReturn(List.of(ADA));
        when(repository.recordReminderSent(eq(ADA.id()), any(), any())).thenReturn(false);

        ReminderJob.Result result = job.runOnce();

        verifyNoInteractions(publisher);
        assertThat(result).isEqualTo(new ReminderJob.Result(0, 1, false));
    }

    @Test
    void stopsTheRunWhenPublishFails() {
        when(repository.findAll()).thenReturn(List.of(ADA, GRACE));
        doThrow(new AmqpException("broker unavailable")).when(publisher).publish(any());

        ReminderJob.Result result = job.runOnce();

        // Only the first is attempted; in production its record is rolled back with the transaction.
        verify(publisher).publish(any());
        verify(repository, never()).recordReminderSent(eq(GRACE.id()), any(), any());
        assertThat(result).isEqualTo(new ReminderJob.Result(0, 0, true));
    }

    @Test
    void doesNothingWithoutBirthdays() {
        when(repository.findAll()).thenReturn(List.of());

        ReminderJob.Result result = job.runOnce();

        verifyNoInteractions(publisher);
        assertThat(result).isEqualTo(new ReminderJob.Result(0, 0, false));
    }
}
