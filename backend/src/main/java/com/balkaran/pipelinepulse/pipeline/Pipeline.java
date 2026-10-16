package com.balkaran.pipelinepulse.pipeline;

import java.time.Instant;

public record Pipeline(
        String id,
        String name,
        String product,
        Instant createdAt
) {
}