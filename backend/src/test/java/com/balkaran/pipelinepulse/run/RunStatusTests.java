package com.balkaran.pipelinepulse.run;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RunStatusTests {

    private static final String COMMIT_SHA =
            "0123456789abcdef0123456789abcdef01234567";

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private RunService service;

    @Autowired
    private RunRepository repository;

    private String pipelineId;
    private String runId;
    private OffsetDateTime startedAt;

    @BeforeEach
    void setUp() {
        String prefix = UUID.randomUUID().toString();

        pipelineId = prefix + "-pipeline";
        runId = prefix + "-run";

        startedAt = OffsetDateTime.now(ZoneOffset.UTC)
                .minusDays(1)
                .truncatedTo(ChronoUnit.MICROS);

        jdbcClient.sql("""
                INSERT INTO pipelines (id, name, product)
                VALUES (:id, 'Run status test', 'flasharray')
                """)
                .param("id", pipelineId)
                .update();

        jdbcClient.sql("""
                INSERT INTO runs (
                    id, pipeline_id, started_at, triggered_by, commit_sha
                )
                VALUES (
                    :id, :pipelineId, :startedAt,
                    'Run status test', :commitSha
                )
                """)
                .param("id", runId)
                .param("pipelineId", pipelineId)
                .param("startedAt", startedAt)
                .param("commitSha", COMMIT_SHA)
                .update();
    }

    @Test
    void allTerminalStatusesSetConsistentCompletionFields() {
        for (String status : List.of("passed", "failed", "flaky")) {
            update("running");

            Run completed = update(status);

            assertEquals(status, completed.status());
            assertEquals(runId, completed.id());
            assertEquals(pipelineId, completed.pipelineId());
            assertEquals(startedAt.toInstant(), completed.startedAt());
            assertEquals("Run status test", completed.triggeredBy());
            assertEquals(COMMIT_SHA, completed.commitSha());

            assertCompletedAndStored(completed);
        }
    }

    @Test
    void repeatingOrCorrectingCompletedStatusPreservesTiming() {
        Run original = markCompleted();

        Run repeated = update("passed");
        assertEquals(original, repeated);

        for (String status : List.of("failed", "flaky")) {
            Run corrected = update(status);

            assertEquals(status, corrected.status());
            assertEquals(original.finishedAt(), corrected.finishedAt());
            assertEquals(original.durationMs(), corrected.durationMs());

            assertCompletedAndStored(corrected);
        }
    }

    @Test
    void reopeningClearsTimingAndAllowsNewCompletion() {
        for (String status : List.of("queued", "running")) {
            Run original = markCompleted();

            Run reopened = update(status);

            assertEquals(status, reopened.status());
            assertEquals(original.startedAt(), reopened.startedAt());
            assertNull(reopened.finishedAt());
            assertNull(reopened.durationMs());

            assertEquals(
                    reopened,
                    repository.findById(runId).orElseThrow()
            );

            Run completedAgain = update("flaky");

            assertTrue(
                    completedAgain.finishedAt()
                            .isAfter(original.finishedAt())
            );

            assertCompletedAndStored(completedAgain);
        }
    }

    @Test
    void futureStartTimeCannotProduceNegativeDuration() {
        OffsetDateTime futureStart = OffsetDateTime.now(ZoneOffset.UTC)
                .plusDays(1)
                .truncatedTo(ChronoUnit.MICROS);

        jdbcClient.sql("""
                UPDATE runs
                SET started_at = :startedAt
                WHERE id = :id
                """)
                .param("startedAt", futureStart)
                .param("id", runId)
                .update();

        Run completed = update("passed");

        assertEquals(futureStart.toInstant(), completed.startedAt());
        assertEquals(futureStart.toInstant(), completed.finishedAt());
        assertEquals(0L, completed.durationMs().longValue());

        assertCompletedAndStored(completed);
    }

    private Run update(String status) {
        return service.updateStatus(
                runId,
                new UpdateRunRequest(status)
        );
    }

    private Run markCompleted() {
        jdbcClient.sql("""
                UPDATE runs
                SET status = 'passed',
                    finished_at = :finishedAt,
                    duration_ms = 60000
                WHERE id = :id
                """)
                .param("finishedAt", startedAt.plusMinutes(1))
                .param("id", runId)
                .update();

        return repository.findById(runId).orElseThrow();
    }

    private void assertCompletedAndStored(Run run) {
        assertNotNull(run.finishedAt());
        assertNotNull(run.durationMs());
        assertFalse(run.finishedAt().isBefore(run.startedAt()));

        assertEquals(
                Duration.between(
                        run.startedAt(),
                        run.finishedAt()
                ).toMillis(),
                run.durationMs().longValue()
        );

        assertEquals(
                run,
                repository.findById(runId).orElseThrow()
        );
    }
}