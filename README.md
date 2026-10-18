# Pipeline Pulse

Assignment ID: EVP-FS-TH-01

A dashboard for viewing and managing CI pipelines, runs, and triage notes.

## Stack

- React, TypeScript, and Vite
- Java 21 and Spring Boot
- PostgreSQL
- Flyway SQL migrations
- Docker Compose

## Run the complete stack

Prerequisite: Docker Desktop or Docker Engine with Docker Compose.

From the repository root:

    docker compose up --build

No .env file is required.

- Frontend: http://localhost:3000
- API health: http://localhost:8080/api/v1/health

To run in the background and wait for readiness:

    docker compose up --build -d --wait

To inspect services:

    docker compose ps

To stop and remove containers while keeping the database volume:

    docker compose down

The frontend serves compiled React assets through Nginx.
Requests to /api/ are forwarded to the API container.
Flyway applies database migrations when the API starts.

## Local development alongside Docker

Before starting a frontend or backend development server locally, stop its
corresponding container to free port 3000 or 8080:

    docker compose stop frontend
    docker compose stop api

Keep the database running for backend development and the current backend tests.

## Application ports

- Frontend: http://localhost:3000
- API: http://localhost:8080/api/v1

## Development status

The frontend scaffold, API, and PostgreSQL run through Docker Compose.
The initial schema migration and database-aware health endpoint are implemented.
Pipeline creation, listing, individual retrieval, partial updates, and
deletion are implemented, with validation and structured JSON errors.

Pipeline creation supports an optional Idempotency-Key header.
Run creation, listing, status filtering, and cursor pagination are implemented.
New runs start as queued, with a generated ID and start timestamp.

Run details are implemented and include associated notes.
Run status updates and completion timing are implemented.
Live run-status streaming through Server-Sent Events is implemented.
Note creation and deletion are implemented.
Seed-data import is implemented and verified, including repeat execution
and persistence across an API restart.

Frontend routing is implemented for the pipelines list, pipeline runs,
and run details, with a fallback for unknown URLs. These currently show
page shells; data fetching and management controls are pending.

Pipeline updates accept name, product, or both. Omitted fields remain
unchanged. Blank names, unsupported products, explicit nulls, non-string
values, empty objects, and unknown fields are rejected with HTTP 400.
For pipeline creation, the same Idempotency-Key and submitted name/product
return HTTP 201 with the original response. Reusing the key with different
input returns HTTP 409. A blank key returns HTTP 400. Requests without a key
create separate pipelines.

The pipeline and saved response are written in one transaction. Database
locking coordinates concurrent requests using the same key. Saved responses
survive pipeline updates, deletion, and API restarts.

Idempotency records currently have no expiry. A production deployment
would need a documented retention policy and cleanup process.


## Frontend development

From the repository root:

    nvm use
    cd frontend
    npm ci
    npm run dev

Open http://localhost:3000.

To verify the frontend:

    npm run build
    npm run lint
The Vite development server forwards /api requests to the API on port 8080.
Keep the API running while developing the frontend locally.

## Backend development

Keep Docker Desktop running.

From the repository root:

    docker compose up -d --wait db
    export JAVA_HOME=$(/usr/libexec/java_home -v 21)
    export PATH="$JAVA_HOME/bin:$PATH"
    cd backend
    ./mvnw spring-boot:run

The backend listens on port 8080 with context path /api/v1.

In another terminal, check its database connection:

    curl -i http://localhost:8080/api/v1/health

A successful check returns HTTP 200:

    {"status":"ok","db":"ok"}

A database connection failure returns HTTP 503:

    {"status":"error","db":"unavailable"}

To build and run the current tests, with PostgreSQL running:

    cd backend
    ./mvnw clean verify

Run the commands above from the repository root unless already inside backend.

### Idempotency verification

With the API and PostgreSQL running, execute from the repository root:

```bash
nvm use
node backend/scripts/check-idempotency.mjs
```

This checks concurrent creation, conflicting input, original-response replay
after updates and deletion, requests without keys, and blank-key validation.
It creates and deletes test pipelines; their idempotency records remain.

## Run listing

GET /api/v1/pipelines/{pipelineId}/runs supports optional status, limit,
and cursor parameters.

Results are ordered by startedAt descending, then ID descending.
The response contains items and nextCursor. A null nextCursor means
there are no more results.

The default limit is 20; accepted values are 1–100.
Allowed statuses are queued, running, passed, failed, and flaky.
When following a cursor, keep the same pipeline and status filter.

Invalid parameters return HTTP 400. A missing pipeline returns HTTP 404.
An existing pipeline without matching runs returns an empty items array.

RunListingTests covers timestamp ties, pipeline separation, filtered
pagination, inserts and deletions between pages, cursor scope, and empty
or missing pipelines. These database tests run through ./mvnw clean verify
with PostgreSQL running and roll back their test data afterward.

## Run details

GET /api/v1/runs/{id} returns the run's fields and a notes array.
Notes are ordered by creation time ascending, then ID ascending.
Runs without notes return an empty array. Missing runs return HTTP 404.


## Run status updates

PATCH /api/v1/runs/{id} accepts a required status: queued, running,
passed, failed, or flaky.

Completed statuses—passed, failed, and flaky—record finishedAt and
calculate durationMs from the stored startedAt. Repeating the same status
preserves existing values. Changes between completed statuses preserve
completion timing.

Moving back to queued or running clears finishedAt and durationMs.
Finishing again records a new completion time. The original startedAt
remains unchanged.

Updates use a database transaction and row lock. Invalid input returns
HTTP 400; a missing run returns HTTP 404.

RunStatusTests verifies completion timing, repeated updates, corrections
between completed statuses, reopening, and nonnegative duration.

## Live run events

GET /api/v1/runs/{id}/events opens a Server-Sent Events stream.

The stream immediately sends the current status, then sends updates when
the status changes. Data messages contain JSON such as {"status":"running"}.
Keep-alive comments are sent every 15 seconds.

Disconnected subscribers are removed. A missing run returns HTTP 404
with a structured JSON error.

Streaming works directly on port 8080 and through the frontend's Nginx
proxy on port 3000.

RunEventsCleanupTests verifies 50 sequential connections and disconnections,
checking that no subscribers remain registered after each disconnection.
This backend test is separate from the pending frontend navigation checks.

## Notes

POST /api/v1/runs/{runId}/notes accepts author and body and returns
HTTP 201 with the created note. Both fields must be nonblank. Surrounding
author whitespace is trimmed; body formatting is preserved.

DELETE /api/v1/notes/{id} returns HTTP 204 with no body.

Invalid input returns HTTP 400. Missing runs or notes return HTTP 404.
Created notes appear in run details. Deleting a pipeline also deletes
its runs and their notes.

NoteWorkflowTests verifies note creation and retrieval, separation
between runs, deletion, missing resources, and cascading deletion.

## Database and migrations

PostgreSQL runs through Docker Compose and stores data in the postgres_data
named volume.

Flyway applies versioned SQL migrations from backend/migrations.
Maven packages these scripts into the application under db/migration.

The initial migration creates pipelines, runs, and notes, with foreign keys,
cascading deletes, validation constraints, and indexes.

Future schema changes will use new migrations rather than editing an
already-applied migration.

## Seeding

Prerequisites: Docker Compose and Node.js 24, as specified in .nvmrc.

From the repository root:

    nvm use
    docker compose up -d --wait api
    node backend/scripts/seed.mjs

Starting the API ensures database migrations have been applied.

The command reads the supplied seed/seed.json without modifying it and
imports 3 pipelines, 7 runs, and 3 notes.

Records are inserted in dependency order within one transaction.
If an insertion fails, the transaction is rolled back.

Existing IDs are skipped. Re-running the command creates no duplicates
and preserves edits to existing records.

Supplied IDs, statuses, and run timestamps are preserved. PostgreSQL
generates creation timestamps for pipelines and notes because the supplied
file omits them.

Requires no additional npm packages or locally installed PostgreSQL tools.