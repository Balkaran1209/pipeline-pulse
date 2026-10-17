package com.balkaran.pipelinepulse.note;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

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
}