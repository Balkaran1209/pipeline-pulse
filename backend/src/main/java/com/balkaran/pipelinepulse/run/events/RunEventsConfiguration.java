package com.balkaran.pipelinepulse.run.events;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class RunEventsConfiguration {

    @Bean("runEventScheduler")
    public ThreadPoolTaskScheduler runEventScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("run-events-");
        scheduler.setRemoveOnCancelPolicy(true);

        return scheduler;
    }
}