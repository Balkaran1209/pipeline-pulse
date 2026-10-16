package com.balkaran.pipelinepulse.pipeline;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PipelineRepository {

    private static final RowMapper<Pipeline> ROW_MAPPER =
            (resultSet, rowNumber) -> new Pipeline(
                    resultSet.getString("id"),
                    resultSet.getString("name"),
                    resultSet.getString("product"),
                    resultSet.getObject(
                            "created_at", OffsetDateTime.class
                    ).toInstant()
            );

    private final JdbcClient jdbcClient;

    public PipelineRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Pipeline> findAll() {
        return jdbcClient.sql("""
                SELECT id, name, product, created_at
                FROM pipelines
                ORDER BY created_at DESC, id DESC
                """)
                .query(ROW_MAPPER)
                .list();
    }

    public Pipeline create(String id, String name, String product) {
        return jdbcClient.sql("""
                INSERT INTO pipelines (id, name, product)
                VALUES (:id, :name, :product)
                RETURNING id, name, product, created_at
                """)
                .param("id", id)
                .param("name", name)
                .param("product", product)
                .query(ROW_MAPPER)
                .single();
    }

    public Optional<Pipeline> findById(String id) {
    return jdbcClient.sql("""
            SELECT id, name, product, created_at
            FROM pipelines
            WHERE id = :id
            """)
            .param("id", id)
            .query(ROW_MAPPER)
            .optional();
    }

    public int deleteById(String id) {
        return jdbcClient.sql("""
                DELETE FROM pipelines
                WHERE id = :id
                """)
                .param("id", id)
                .update();
    }
}