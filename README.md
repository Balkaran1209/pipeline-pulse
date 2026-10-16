# Pipeline Pulse

Assignment ID: EVP-FS-TH-01

A dashboard for viewing and managing CI pipelines, runs, and triage notes.

## Stack

- React, TypeScript, and Vite
- Java 21 and Spring Boot
- PostgreSQL
- Flyway SQL migrations
- Docker Compose

## Application ports

- Frontend: http://localhost:3000
- API: http://localhost:8080/api/v1

## Development status

React/TypeScript and Spring Boot scaffolds are available.
Database integration and application endpoints are pending.

Run instructions, verification commands, design decisions, and trade-offs
will be added as the application is implemented.


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

From the repository root:

    export JAVA_HOME=$(/usr/libexec/java_home -v 21)
    export PATH="$JAVA_HOME/bin:$PATH"
    cd backend
    ./mvnw spring-boot:run

The server listens on port 8080 with context path /api/v1.
No application endpoints have been implemented yet.

To build and run the current tests:

    ./mvnw clean verify

## Delivery requirements

The completed stack will start with:

    docker compose up --build

The seed command will load the supplied seed/seed.json without modifying it.