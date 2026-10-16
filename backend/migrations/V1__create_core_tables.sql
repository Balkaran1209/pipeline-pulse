CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
    product TEXT NOT NULL
        CHECK (product IN ('flasharray', 'flashblade', 'hyperscale')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL
        REFERENCES pipelines(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'passed', 'failed', 'flaky')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    duration_ms BIGINT CHECK (duration_ms >= 0),
    triggered_by TEXT NOT NULL CHECK (length(btrim(triggered_by)) > 0),
    commit_sha TEXT NOT NULL CHECK (length(btrim(commit_sha)) > 0),
    CONSTRAINT runs_finish_after_start
        CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL
        REFERENCES runs(id) ON DELETE CASCADE,
    author TEXT NOT NULL CHECK (length(btrim(author)) > 0),
    body TEXT NOT NULL CHECK (length(btrim(body)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX runs_pipeline_started_id_idx
    ON runs (pipeline_id, started_at DESC, id DESC);

CREATE INDEX notes_run_created_id_idx
    ON notes (run_id, created_at, id);