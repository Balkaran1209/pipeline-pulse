import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const seedFile = new URL('../../seed/seed.json', import.meta.url);

const source = readFileSync(seedFile, 'utf8');
const seed = JSON.parse(source);

for (const entity of ['pipelines', 'runs', 'notes']) {
  if (!Array.isArray(seed?.[entity])) {
    throw new Error(`seed.json must contain a ${entity} array`);
  }
}

// Base64 lets us send JSON without inserting its raw text into SQL.
const encoded = Buffer.from(source, 'utf8').toString('base64');

const sql = `
BEGIN;

CREATE TEMP TABLE seed_payload (
    document JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_payload (document)
VALUES (
    convert_from(decode('${encoded}', 'base64'), 'UTF8')::jsonb
);

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
`;

const result = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'db',
    'psql',
    '-X',
    '-U',
    'pipeline_pulse',
    '-d',
    'pipeline_pulse',
    '-v',
    'ON_ERROR_STOP=1',
  ],
  {
    cwd: projectRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Seed import complete. Existing IDs were skipped.');