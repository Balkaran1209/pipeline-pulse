package com.balkaran.pipelinepulse.note;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public class NoteRepository {

    private static final RowMapper<Note> ROW_MAPPER =
            (resultSet, rowNumber) -> new Note(
                    resultSet.getString("id"),
                    resultSet.getString("run_id"),
                    resultSet.getString("author"),
                    resultSet.getString("body"),
                    resultSet.getObject(
                            "created_at",
                            OffsetDateTime.class
                    ).toInstant()
            );

    private final JdbcClient jdbcClient;

    public NoteRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Note> findByRunId(String runId) {
        return jdbcClient.sql("""
                SELECT id, run_id, author, body, created_at
                FROM notes
                WHERE run_id = :runId
                ORDER BY created_at ASC, id ASC
                """)
                .param("runId", runId)
                .query(ROW_MAPPER)
                .list();
    }

    public Optional<Note> create(
            String id,
            String runId,
            String author,
            String body
    ) {
        return jdbcClient.sql("""
                INSERT INTO notes (id, run_id, author, body)
                SELECT :id, r.id, :author, :body
                FROM runs r
                WHERE r.id = :runId
                FOR KEY SHARE OF r
                RETURNING id, run_id, author, body, created_at
                """)
                .param("id", id)
                .param("runId", runId)
                .param("author", author)
                .param("body", body)
                .query(ROW_MAPPER)
                .optional();
    }

    public int deleteById(String id) {
        return jdbcClient.sql("""
                DELETE FROM notes
                WHERE id = :id
                """)
                .param("id", id)
                .update();
    }
}