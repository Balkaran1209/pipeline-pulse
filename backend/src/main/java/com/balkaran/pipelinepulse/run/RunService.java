package com.balkaran.pipelinepulse.run;

import java.util.UUID;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Set;

import com.balkaran.pipelinepulse.common.InvalidRequestException;

@Service
public class RunService {

    private static final Set<String> VALID_STATUSES =
        Set.of("queued", "running", "passed", "failed", "flaky");
    private final RunRepository repository;

    public RunService(RunRepository repository) {
        this.repository = repository;
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
}