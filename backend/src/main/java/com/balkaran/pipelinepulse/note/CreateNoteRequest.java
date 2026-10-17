package com.balkaran.pipelinepulse.note;

import jakarta.validation.constraints.NotBlank;

public record CreateNoteRequest(
        @NotBlank(message = "author is required")
        String author,

        @NotBlank(message = "body is required")
        String body
) {
}