package com.balkaran.pipelinepulse.run;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateRunRequest(
        @NotBlank(message = "status is required")
        @Pattern(
                regexp = "queued|running|passed|failed|flaky",
                message = "status must be queued, running, passed, failed, or flaky"
        )
        String status
) {
}