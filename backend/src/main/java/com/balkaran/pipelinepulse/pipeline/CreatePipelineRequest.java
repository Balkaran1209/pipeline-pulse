package com.balkaran.pipelinepulse.pipeline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreatePipelineRequest(
        @NotBlank(message = "name is required")
        String name,

        @NotBlank(message = "product is required")
        @Pattern(
                regexp = "flasharray|flashblade|hyperscale",
                message = "product must be flasharray, flashblade, or hyperscale"
        )
        String product
) {
}