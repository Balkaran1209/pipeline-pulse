package com.balkaran.pipelinepulse.run;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

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
}