package com.balkaran.pipelinepulse.run;

import java.util.UUID;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Set;

import com.balkaran.pipelinepulse.common.InvalidRequestException;
import com.balkaran.pipelinepulse.note.NoteRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.transaction.annotation.Transactional;

import com.balkaran.pipelinepulse.run.events.RunStatusChanged;

import org.springframework.context.ApplicationEventPublisher;

@Service
public class RunService {

    private static final Set<String> VALID_STATUSES =
        Set.of("queued", "running", "passed", "failed", "flaky");
    private static final Set<String> TERMINAL_STATUSES =
        Set.of("passed", "failed", "flaky");

    private final RunRepository repository;
    private final NoteRepository noteRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RunService(
            RunRepository repository,
            NoteRepository noteRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.repository = repository;
        this.noteRepository = noteRepository;
        this.eventPublisher = eventPublisher;
    }

    public Run create(String pipelineId, CreateRunRequest request) {
        return repository.create(
                UUID.randomUUID().toString(),
                pipelineId,
                request.triggeredBy().strip(),
                request.commitSha().strip()
        ).orElseThrow(() ->
                new ResourceNotFoundException(
                        "Pipeline not found: " + pipelineId
                )
        );
    }

    public RunPage findByPipeline(
        String pipelineId,
        String status,
        int limit,
        String cursorValue
    ) {
        if (limit < 1 || limit > 100) {
            throw new InvalidRequestException(
                    "limit must be between 1 and 100"
            );
        }

        if (status != null && !VALID_STATUSES.contains(status)) {
            throw new InvalidRequestException(
                    "status must be queued, running, passed, failed, or flaky"
            );
        }

        RunCursor cursor = RunCursor.decode(
                cursorValue,
                pipelineId,
                status
        );

        if (!repository.pipelineExists(pipelineId)) {
            throw new ResourceNotFoundException(
                    "Pipeline not found: " + pipelineId
            );
        }

        List<Run> rows = repository.findByPipeline(
                pipelineId,
                status,
                limit + 1,
                cursor
        );

        boolean hasMore = rows.size() > limit;

        List<Run> items = List.copyOf(
                rows.subList(0, Math.min(rows.size(), limit))
        );

        String nextCursor = null;

        if (hasMore) {
            Run last = items.getLast();

            nextCursor = new RunCursor(
                    last.startedAt(),
                    last.id()
            ).encode(pipelineId, status);
        }

        return new RunPage(items, nextCursor);
    }
    public RunDetails findById(String id) {
        Run run = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Run not found: " + id)
                );

        return RunDetails.from(
                run,
                noteRepository.findByRunId(id)
        );
    }
    @Transactional
    public Run updateStatus(String id, UpdateRunRequest request) {
        Run current = repository.findByIdForUpdate(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Run not found: " + id)
                );

        String status = request.status();

        if (current.status().equals(status)) {
            return current;
        }

        Instant finishedAt = null;
        Long durationMs = null;

        if (TERMINAL_STATUSES.contains(status)) {
            if (TERMINAL_STATUSES.contains(current.status())) {
                finishedAt = current.finishedAt();
            }

            if (finishedAt == null) {
                Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

                finishedAt = now.isBefore(current.startedAt())
                        ? current.startedAt()
                        : now;
            }

            durationMs = Duration.between(
                    current.startedAt(),
                    finishedAt
            ).toMillis();
        }

        Run updated = repository.updateStatus(
                id,
                status,
                finishedAt,
                durationMs
        );

        eventPublisher.publishEvent(
            new RunStatusChanged(updated.id(), updated.status())
        );

        return updated;
    }
}