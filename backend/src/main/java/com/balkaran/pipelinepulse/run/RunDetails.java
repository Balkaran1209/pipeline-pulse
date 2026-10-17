package com.balkaran.pipelinepulse.run;

import java.time.Instant;
import java.util.List;

import com.balkaran.pipelinepulse.note.Note;

public record RunDetails(
        String id,
        String pipelineId,
        String status,
        Instant startedAt,
        Instant finishedAt,
        Long durationMs,
        String triggeredBy,
        String commitSha,
        List<Note> notes
) {

    public static RunDetails from(Run run, List<Note> notes) {
        return new RunDetails(
                run.id(),
                run.pipelineId(),
                run.status(),
                run.startedAt(),
                run.finishedAt(),
                run.durationMs(),
                run.triggeredBy(),
                run.commitSha(),
                List.copyOf(notes)
        );
    }
}