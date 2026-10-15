package com.birthdaytracker.coordinator.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /** Injected wherever "today" matters, so tests can fix the date. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
