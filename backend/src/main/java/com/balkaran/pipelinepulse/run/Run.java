package com.balkaran.pipelinepulse.run;

import java.time.Instant;

public record Run(
        String id,
        String pipelineId,
        String status,
        Instant startedAt,
        Instant finishedAt,
        Long durationMs, //Long allows durationMs to be null while the run is unfinished.
        String triggeredBy,
        String commitSha
) {
}