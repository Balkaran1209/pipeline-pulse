package com.balkaran.pipelinepulse.run;

import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

import com.balkaran.pipelinepulse.common.InvalidRequestException;

public record RunCursor(Instant startedAt, String id) {

    public String encode(String pipelineId, String status) {
        String payload = String.join(
                "\n",
                "1",
                pipelineId,
                status == null ? "" : status,
                startedAt.toString(),
                id
        );

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }

    public static RunCursor decode(
            String value,
            String pipelineId,
            String status
    ) {
        if (value == null) {
            return null;
        }

        try {
            if (value.isBlank() || value.length() > 2048) {
                throw new IllegalArgumentException();
            }

            String payload = new String(
                    Base64.getUrlDecoder().decode(value),
                    StandardCharsets.UTF_8
            );

            String[] fields = payload.split("\n", -1);

            if (fields.length != 5
                    || !fields[0].equals("1")
                    || !fields[1].equals(pipelineId)
                    || !fields[2].equals(status == null ? "" : status)
                    || fields[4].isBlank()) {
                throw new IllegalArgumentException();
            }

            Instant startedAt = Instant.parse(fields[3]);
            int year = startedAt.atOffset(ZoneOffset.UTC).getYear();

            if (year < 1 || year > 9999) {
                throw new IllegalArgumentException();
            }

            return new RunCursor(startedAt, fields[4]);
        } catch (IllegalArgumentException | DateTimeException exception) {
            throw new InvalidRequestException(
                    "cursor is invalid or belongs to a different pipeline "
                            + "or status filter"
            );
        }
    }
}