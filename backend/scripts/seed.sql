\set ON_ERROR_STOP on
\set seed_document `cat /seed/seed.json`

BEGIN;

CREATE TEMP TABLE seed_payload (
    document JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_payload (document)
VALUES (:'seed_document'::jsonb);

INSERT INTO pipelines (id, name, product)
SELECT p.id, p.name, p.product
FROM jsonb_to_recordset(
    (SELECT document->'pipelines' FROM seed_payload)
) AS p (
    id TEXT,
    name TEXT,
    product TEXT
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO runs (
    id,
    pipeline_id,
    status,
    started_at,
    finished_at,
    duration_ms,
    triggered_by,
    commit_sha
)
SELECT
    r.id,
    r."pipelineId",
    r.status,
    r."startedAt",
    r."finishedAt",
    r."durationMs",
    r."triggeredBy",
    r."commitSha"
FROM jsonb_to_recordset(
    (SELECT document->'runs' FROM seed_payload)
) AS r (
    id TEXT,
    "pipelineId" TEXT,
    status TEXT,
    "startedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,
    "durationMs" BIGINT,
    "triggeredBy" TEXT,
    "commitSha" TEXT
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notes (id, run_id, author, body)
SELECT n.id, n."runId", n.author, n.body
FROM jsonb_to_recordset(
    (SELECT document->'notes' FROM seed_payload)
) AS n (
    id TEXT,
    "runId" TEXT,
    author TEXT,
    body TEXT
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

\echo Seed import complete. Existing IDs were skipped.