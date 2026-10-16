CREATE TABLE pipeline_creation_requests (
    idempotency_key TEXT PRIMARY KEY
        CHECK (length(btrim(idempotency_key)) > 0),

    request_name TEXT NOT NULL,
    request_product TEXT NOT NULL,

    response_id TEXT NOT NULL,
    response_name TEXT NOT NULL,
    response_product TEXT NOT NULL,
    response_created_at TIMESTAMPTZ NOT NULL
);