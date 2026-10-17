package com.balkaran.pipelinepulse.run;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.balkaran.pipelinepulse.common.InvalidRequestException;
import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RunListingTests {

    private static final OffsetDateTime BASE_TIME =
            OffsetDateTime.parse("2026-10-10T12:00:00Z");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private RunService service;

    private String prefix;
    private String pipelineId;
    private String otherPipelineId;

    @BeforeEach
    void setUp() {
        prefix = UUID.randomUUID().toString();
        pipelineId = id("pipeline");
        otherPipelineId = id("other-pipeline");

        addPipeline(pipelineId);
        addPipeline(otherPipelineId);

        // Three runs deliberately share the same timestamp.
        addRun("a", pipelineId, "queued", BASE_TIME);
        addRun("b", pipelineId, "running", BASE_TIME);
        addRun("c", pipelineId, "queued", BASE_TIME);

        // This run has a larger ID suffix but an older timestamp.
        addRun("d", pipelineId, "queued", BASE_TIME.minusHours(1));

        // A newer run belonging to another pipeline.
        addRun("z", otherPipelineId, "queued", BASE_TIME.plusHours(1));
    }

    @Test
    void pagesUseTimestampThenIdWithoutMixingPipelines() {
        RunPage first = service.findByPipeline(
                pipelineId, null, 2, null
        );

        assertEquals(List.of(id("c"), id("b")), ids(first));
        assertNotNull(first.nextCursor());

        RunPage second = service.findByPipeline(
                pipelineId, null, 2, first.nextCursor()
        );

        assertEquals(List.of(id("a"), id("d")), ids(second));
        assertNull(second.nextCursor());
    }

    @Test
    void statusFilteringWorksAcrossPages() {
        RunPage first = service.findByPipeline(
                pipelineId, "queued", 1, null
        );

        assertEquals(List.of(id("c")), ids(first));
        assertNotNull(first.nextCursor());

        RunPage second = service.findByPipeline(
                pipelineId, "queued", 1, first.nextCursor()
        );

        assertEquals(List.of(id("a")), ids(second));
        assertNotNull(second.nextCursor());

        RunPage third = service.findByPipeline(
                pipelineId, "queued", 1, second.nextCursor()
        );

        assertEquals(List.of(id("d")), ids(third));
        assertNull(third.nextCursor());
    }

    @Test
    void insertingANewerRunDoesNotShiftTheNextPage() {
        RunPage first = service.findByPipeline(
                pipelineId, null, 2, null
        );

        assertEquals(List.of(id("c"), id("b")), ids(first));
        assertNotNull(first.nextCursor());

        addRun("new", pipelineId, "queued", BASE_TIME.plusHours(1));

        RunPage second = service.findByPipeline(
                pipelineId, null, 2, first.nextCursor()
        );

        assertEquals(List.of(id("a"), id("d")), ids(second));
        assertNull(second.nextCursor());

        RunPage freshFirstPage = service.findByPipeline(
                pipelineId, null, 1, null
        );

        assertEquals(List.of(id("new")), ids(freshFirstPage));
    }

    @Test
    void cursorStillWorksAfterItsBoundaryRunIsDeleted() {
        RunPage first = service.findByPipeline(
                pipelineId, null, 2, null
        );

        assertEquals(List.of(id("c"), id("b")), ids(first));
        assertNotNull(first.nextCursor());

        jdbcClient.sql("DELETE FROM runs WHERE id = :id")
                .param("id", id("b"))
                .update();

        RunPage second = service.findByPipeline(
                pipelineId, null, 2, first.nextCursor()
        );

        assertEquals(List.of(id("a"), id("d")), ids(second));
        assertNull(second.nextCursor());
    }

    @Test
    void cursorCannotBeReusedWithAnotherPipelineOrFilter() {
        RunPage first = service.findByPipeline(
                pipelineId, "queued", 1, null
        );

        assertNotNull(first.nextCursor());

        assertThrows(
                InvalidRequestException.class,
                () -> service.findByPipeline(
                        otherPipelineId,
                        "queued",
                        1,
                        first.nextCursor()
                )
        );

        assertThrows(
                InvalidRequestException.class,
                () -> service.findByPipeline(
                        pipelineId,
                        "running",
                        1,
                        first.nextCursor()
                )
        );
    }

    @Test
    void existingPipelineWithoutRunsReturnsAnEmptyPage() {
        String emptyPipelineId = id("empty-pipeline");
        addPipeline(emptyPipelineId);

        RunPage page = service.findByPipeline(
                emptyPipelineId, null, 20, null
        );

        assertEquals(List.of(), page.items());
        assertNull(page.nextCursor());
    }

    @Test
    void missingPipelineIsRejected() {
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.findByPipeline(
                        id("missing-pipeline"), null, 20, null
                )
        );
    }

    private String id(String suffix) {
        return prefix + "-" + suffix;
    }

    private List<String> ids(RunPage page) {
        return page.items().stream().map(Run::id).toList();
    }

    private void addPipeline(String pipelineId) {
        jdbcClient.sql("""
                INSERT INTO pipelines (id, name, product)
                VALUES (:id, :name, 'flasharray')
                """)
                .param("id", pipelineId)
                .param("name", "Run listing test")
                .update();
    }

    private void addRun(
            String suffix,
            String pipelineId,
            String status,
            OffsetDateTime startedAt
    ) {
        jdbcClient.sql("""
                INSERT INTO runs (
                    id, pipeline_id, status, started_at,
                    triggered_by, commit_sha
                )
                VALUES (
                    :id, :pipelineId, :status, :startedAt,
                    'Run listing test',
                    '0123456789abcdef0123456789abcdef01234567'
                )
                """)
                .param("id", id(suffix))
                .param("pipelineId", pipelineId)
                .param("status", status)
                .param("startedAt", startedAt)
                .update();
    }
}