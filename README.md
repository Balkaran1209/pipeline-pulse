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
Run and note APIs and frontend views are pending.

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

The seed import command is not implemented yet.
It will load the supplied seed/seed.json without modifying it.