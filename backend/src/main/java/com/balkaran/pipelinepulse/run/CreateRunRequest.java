package com.balkaran.pipelinepulse.run;

import jakarta.validation.constraints.NotBlank;

public record CreateRunRequest(
        @NotBlank(message = "triggeredBy is required")
        String triggeredBy,

        @NotBlank(message = "commitSha is required")
        String commitSha
) {
}