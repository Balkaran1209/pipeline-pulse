package com.balkaran.pipelinepulse.run.events;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ScheduledFuture;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;
import com.balkaran.pipelinepulse.run.Run;
import com.balkaran.pipelinepulse.run.RunRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class RunEventService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(RunEventService.class);

    private final RunRepository repository;
    private final TaskScheduler scheduler;
    private final Duration heartbeatInterval;

    private final ConcurrentMap<String, Set<Subscription>> subscribers =
            new ConcurrentHashMap<>();

    private ScheduledFuture<?> heartbeatTask;
    private volatile boolean stopping;

    public RunEventService(
            RunRepository repository,
            @Qualifier("runEventScheduler") TaskScheduler scheduler,
            @Value("${app.run-events.heartbeat-ms:15000}") long heartbeatMillis
    ) {
        if (heartbeatMillis <= 0) {
            throw new IllegalArgumentException(
                    "Heartbeat interval must be positive"
            );
        }

        this.repository = repository;
        this.scheduler = scheduler;
        this.heartbeatInterval = Duration.ofMillis(heartbeatMillis);
    }

    @PostConstruct
    public void startHeartbeat() {
        heartbeatTask = scheduler.scheduleWithFixedDelay(
                () -> subscribers.keySet()
                        .forEach(runId -> refreshRun(runId, true)),
                heartbeatInterval
        );
    }

    public SseEmitter subscribe(String runId) throws IOException {
        Subscription subscription = new Subscription(runId);

        subscription.emitter.onCompletion(() -> remove(subscription));
        subscription.emitter.onError(error -> remove(subscription));
        subscription.emitter.onTimeout(() -> close(subscription));

        synchronized (subscription) {
            if (stopping) {
                throw new IllegalStateException(
                        "Run event streaming is stopping"
                );
            }

            subscribers.compute(runId, (key, group) -> {
                if (group == null) {
                    group = ConcurrentHashMap.newKeySet();
                }

                group.add(subscription);
                return group;
            });

            try {
                Run run = repository.findById(runId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Run not found: " + runId
                                )
                        );

                sendStatus(subscription, run.status());
            } catch (IOException | RuntimeException exception) {
                remove(subscription);
                throw exception;
            }
        }

        return subscription.emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatusChanged(RunStatusChanged event) {
        if (stopping) {
            return;
        }

        var group = subscribers.get(event.runId());

        if (group == null) {
            return;
        }

        var recipients = List.copyOf(group);

        try {
            scheduler.schedule(
                    () -> recipients.forEach(subscription ->
                            deliverStatus(subscription, event.status())
                    ),
                    Instant.now()
            );
        } catch (TaskRejectedException exception) {
            LOGGER.debug(
                    "Run event delivery stopped during shutdown",
                    exception
            );
        }
    }
    private void deliverStatus(
            Subscription subscription,
            String status
    ) {
        synchronized (subscription) {
            if (subscription.closed
                    || status.equals(subscription.lastStatus)) {
                return;
            }

            try {
                sendStatus(subscription, status);
            } catch (IOException | IllegalStateException exception) {
                remove(subscription);
            }
        }
    }

    private void refreshRun(String runId, boolean heartbeat) {
        Set<Subscription> group = subscribers.get(runId);

        if (group == null) {
            return;
        }

        for (Subscription subscription : List.copyOf(group)) {
            refresh(subscription, heartbeat);
        }
    }

    private void refresh(Subscription subscription, boolean heartbeat) {
        synchronized (subscription) {
            if (subscription.closed) {
                return;
            }

            try {
                var found = repository.findById(subscription.runId);

                if (found.isEmpty()) {
                    close(subscription);
                    return;
                }

            if (heartbeat) {
                subscription.emitter.send(
                        SseEmitter.event().comment("keep-alive")
                );
            }
            } catch (IOException | IllegalStateException exception) {
                remove(subscription);
            } catch (DataAccessException exception) {
                LOGGER.warn(
                        "Unable to refresh events for run {}: {}",
                        subscription.runId,
                        exception.getMostSpecificCause().getMessage()
                );
            }
        }
    }

    private void sendStatus(
            Subscription subscription,
            String status
    ) throws IOException {
        subscription.emitter.send(
                SseEmitter.event().data(
                        new StatusEvent(status),
                        MediaType.APPLICATION_JSON
                )
        );

        subscription.lastStatus = status;
    }

    private void remove(Subscription subscription) {
        subscription.closed = true;

        subscribers.computeIfPresent(
                subscription.runId,
                (key, group) -> {
                    group.remove(subscription);
                    return group.isEmpty() ? null : group;
                }
        );
    }

    private void close(Subscription subscription) {
        remove(subscription);
        subscription.emitter.complete();
    }

    int subscriberCount() {
        return subscribers.values().stream()
                .mapToInt(Set::size)
                .sum();
    }

    @PreDestroy
    public void stop() {
        stopping = true;

        if (heartbeatTask != null) {
            heartbeatTask.cancel(false);
        }

        subscribers.values().forEach(group ->
                List.copyOf(group).forEach(this::close)
        );

        subscribers.clear();
    }

    public record StatusEvent(String status) {
    }

    private static final class Subscription {

        private final String runId;
        private final SseEmitter emitter = new SseEmitter(0L);

        private String lastStatus;
        private volatile boolean closed;

        private Subscription(String runId) {
            this.runId = runId;
        }
    }
}