package com.balkaran.pipelinepulse.note;

import java.time.Instant;

public record Note(
        String id,
        String runId,
        String author,
        String body,
        Instant createdAt
) {
}