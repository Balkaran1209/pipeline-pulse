package com.balkaran.pipelinepulse.pipeline;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PipelineCreationRequestRepository {

    private static final RowMapper<SavedCreation> ROW_MAPPER =
            (resultSet, rowNumber) -> new SavedCreation(
                    resultSet.getString("request_name"),
                    resultSet.getString("request_product"),
                    new Pipeline(
                            resultSet.getString("response_id"),
                            resultSet.getString("response_name"),
                            resultSet.getString("response_product"),
                            resultSet.getObject(
                                    "response_created_at",
                                    OffsetDateTime.class
                            ).toInstant()
                    )
            );

    private final JdbcClient jdbcClient;

    public PipelineCreationRequestRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void lockKey(String key) {
        jdbcClient.sql("""
                SELECT pg_advisory_xact_lock(
                    hashtextextended(CAST(:key AS TEXT), 0)
                )
                """)
                .param("key", "pipeline-create:" + key)
                .query((resultSet, rowNumber) -> Boolean.TRUE)
                .single();
    }

    public Optional<SavedCreation> findByKey(String key) {
        return jdbcClient.sql("""
                SELECT request_name, request_product,
                       response_id, response_name,
                       response_product, response_created_at
                FROM pipeline_creation_requests
                WHERE idempotency_key = :key
                """)
                .param("key", key)
                .query(ROW_MAPPER)
                .optional();
    }

    public void save(
            String key,
            CreatePipelineRequest request,
            Pipeline response
    ) {
        jdbcClient.sql("""
                INSERT INTO pipeline_creation_requests (
                    idempotency_key,
                    request_name,
                    request_product,
                    response_id,
                    response_name,
                    response_product,
                    response_created_at
                )
                VALUES (
                    :key,
                    :requestName,
                    :requestProduct,
                    :responseId,
                    :responseName,
                    :responseProduct,
                    :responseCreatedAt
                )
                """)
                .param("key", key)
                .param("requestName", request.name())
                .param("requestProduct", request.product())
                .param("responseId", response.id())
                .param("responseName", response.name())
                .param("responseProduct", response.product())
                .param(
                        "responseCreatedAt",
                        response.createdAt().atOffset(ZoneOffset.UTC)
                )
                .update();
    }

    public record SavedCreation(
            String requestName,
            String requestProduct,
            Pipeline response
    ) {
    }
}