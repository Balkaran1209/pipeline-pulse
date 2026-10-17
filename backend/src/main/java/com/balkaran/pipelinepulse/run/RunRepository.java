package com.balkaran.pipelinepulse.run;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import java.time.ZoneOffset;
import java.util.List;
import java.time.Instant;

@Repository
public class RunRepository {

    private static final RowMapper<Run> ROW_MAPPER =
            (resultSet, rowNumber) -> {
                OffsetDateTime finishedAt = resultSet.getObject(
                        "finished_at",
                        OffsetDateTime.class
                );

                return new Run(
                        resultSet.getString("id"),
                        resultSet.getString("pipeline_id"),
                        resultSet.getString("status"),
                        resultSet.getObject(
                                "started_at",
                                OffsetDateTime.class
                        ).toInstant(),
                        finishedAt == null ? null : finishedAt.toInstant(),
                        resultSet.getObject("duration_ms", Long.class),
                        resultSet.getString("triggered_by"),
                        resultSet.getString("commit_sha")
                );
            };

    private final JdbcClient jdbcClient;

    public RunRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<Run> create(
            String id,
            String pipelineId,
            String triggeredBy,
            String commitSha
    ) {
        return jdbcClient.sql("""
                INSERT INTO runs (
                    id, pipeline_id, triggered_by, commit_sha
                )
                SELECT :id, p.id, :triggeredBy, :commitSha
                FROM pipelines p
                WHERE p.id = :pipelineId
                FOR KEY SHARE OF p
                RETURNING id, pipeline_id, status, started_at,
                          finished_at, duration_ms,
                          triggered_by, commit_sha
                """)
                .param("id", id)
                .param("pipelineId", pipelineId)
                .param("triggeredBy", triggeredBy)
                .param("commitSha", commitSha)
                .query(ROW_MAPPER)
                .optional();
    }

    public boolean pipelineExists(String pipelineId) {
    return jdbcClient.sql("""
            SELECT EXISTS (
                SELECT 1
                FROM pipelines
                WHERE id = :pipelineId
            )
            """)
            .param("pipelineId", pipelineId)
            .query(Boolean.class)
            .single();
    }

    public List<Run> findByPipeline(
            String pipelineId,
            String status,
            int fetchLimit,
            RunCursor cursor
    ) {
        String sql = """
                SELECT id, pipeline_id, status, started_at,
                    finished_at, duration_ms, triggered_by, commit_sha
                FROM runs
                WHERE pipeline_id = :pipelineId
                """;

        if (status != null) {
            sql += " AND status = :status";
        }

        if (cursor != null) {
            sql += " AND (started_at, id) < (:cursorStartedAt, :cursorId)";
        }

        sql += " ORDER BY started_at DESC, id DESC LIMIT :fetchLimit";

        var query = jdbcClient.sql(sql)
                .param("pipelineId", pipelineId)
                .param("fetchLimit", fetchLimit);

        if (status != null) {
            query.param("status", status);
        }

        if (cursor != null) {
            query.param(
                    "cursorStartedAt",
                    cursor.startedAt().atOffset(ZoneOffset.UTC)
            );
            query.param("cursorId", cursor.id());
        }

        return query.query(ROW_MAPPER).list();
    }

    public Optional<Run> findById(String id) {
    return jdbcClient.sql("""
            SELECT id, pipeline_id, status, started_at,
                   finished_at, duration_ms, triggered_by, commit_sha
            FROM runs
            WHERE id = :id
            """)
            .param("id", id)
            .query(ROW_MAPPER)
            .optional();
    }

    public Optional<Run> findByIdForUpdate(String id) {
    return jdbcClient.sql("""
            SELECT id, pipeline_id, status, started_at,
                   finished_at, duration_ms, triggered_by, commit_sha
            FROM runs
            WHERE id = :id
            FOR UPDATE
            """)
            .param("id", id)
            .query(ROW_MAPPER)
            .optional();
    }

    public Run updateStatus(
        String id,
        String status,
        Instant finishedAt,
        Long durationMs
    ) {
        return jdbcClient.sql("""

                UPDATE runs
                SET status = :status,
                    finished_at = CAST(:finishedAt AS TIMESTAMP WITH TIME ZONE),
                    duration_ms = CAST(:durationMs AS BIGINT)
                WHERE id = :id
                RETURNING id, pipeline_id, status, started_at,
                        finished_at, duration_ms, triggered_by, commit_sha
                """)
                .param("id", id)
                .param("status", status)
                .param(
                        "finishedAt",
                        finishedAt == null
                                ? null
                                : finishedAt.atOffset(ZoneOffset.UTC)
                )
                .param("durationMs", durationMs)
                .query(ROW_MAPPER)
                .single();
    }
}