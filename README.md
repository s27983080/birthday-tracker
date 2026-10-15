# birthday-tracker

A birthday tracking application made up of a web UI and two backend services that communicate through a message queue and share a single data store.

## Running Locally

**Prerequisites:** Docker Desktop (or Docker Engine with Compose v2). Node.js 22+ is only needed to run the frontend/API tests outside Docker.

```sh
docker compose up --build -d --wait   # build images and start the stack
./scripts/smoke-test.sh               # verify every service is healthy and wired up
docker compose down                   # stop (add -v to also delete the database and queue volumes)
```

| Service             | URL                                                                     |
| ------------------- | ----------------------------------------------------------------------- |
| UI                  | http://localhost:8081                                                   |
| Backend API         | http://localhost:3000 (also proxied by the UI at `/api`)                |
| Coordinator         | http://localhost:8082/actuator/health                                   |
| RabbitMQ management | http://localhost:15672 (user/password `birthday` / `birthday`)          |
| PostgreSQL          | `localhost:5432`, database `birthdays` (user/password `birthday` / `birthday`) |

Credentials, queue names and host ports have defaults in `docker-compose.yml`. To override them, copy `.env.example` to `.env` and edit it, e.g. if a port is already in use on your machine.

### Tests

| Layer    | Command                       | What it covers                                    |
| -------- | ----------------------------- | ------------------------------------------------- |
| API      | `cd api && npm test`          | Vitest; routes exercised in-process via `inject()` |
| Frontend | `cd frontend && npm test`     | Vitest + Vue Test Utils (jsdom)                   |
| Stack    | `./scripts/smoke-test.sh`     | Container health, endpoints, `/api` proxy, schema |

API and frontend tests also run during their Docker image builds, so a failing test fails `docker compose up --build`. Coordinator tests are not set up yet.

### Troubleshooting

- **Coordinator restarts with `password authentication failed for user "birthday"`, or the `birthdays` table is missing:** Postgres only runs `db/init` when its data volume is first created. If the `pgdata` volume was created earlier with different settings, reset it with `docker compose down -v` (this deletes local data).
- **`ports are not available`:** another process is using a host port. Set `API_PORT`, `COORDINATOR_PORT` or `FRONTEND_PORT` in `.env`.

## Repository Layout

| Path           | Contents                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| `frontend/`    | Vue + TypeScript (Vite) UI, served by nginx, which also proxies `/api` to the API |
| `api/`         | Fastify + TypeScript Backend API                                                 |
| `coordinator/` | Spring Boot (Java 21) Backend Coordinator                                        |
| `db/init/`     | SQL run by Postgres on first start; defines the `birthdays` table                |
| `scripts/`     | Developer scripts (stack smoke test)                                             |

## Architecture

### Tech Stack

| Layer                           | Technology                     | Responsibility                                                                                                                                                                                     |
| ------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (UI Application)       | Vue + TypeScript               | Lets users in the browser submit birthdays (with a 1–14 day reminder window) and view a list of birthdays or a single birthday. Talks to the Backend API over HTTP/JSON.                           |
| Backend API Application         | Fastify + TypeScript (Node.js) | Validates birthday submissions and publishes them to the message queue. Serves REST endpoints that read the birthday list and individual birthdays from the database.                              |
| Backend Coordinator Application | Spring Boot (Java)             | Consumes birthday submission messages and writes them to the database. Runs a daily job that checks birthdays against their reminder windows and publishes reminder messages to the message queue. |
| Database                        | PostgreSQL                     | Shared data store for both backend services.                                                                                                                                                       |
| Message Queue                   | RabbitMQ                       | Carries birthday submissions from the Backend API to the Coordinator, and reminder messages from the Coordinator to the downstream email team's application.                                       |

### How the Pieces Connect

```mermaid
flowchart LR
    user(["User (browser)"])

    subgraph frontend["Frontend"]
        ui["UI Application<br/>Vue + TypeScript"]
    end

    subgraph api_layer["Backend API"]
        api["Backend API Application<br/>Fastify + TypeScript"]
    end

    subgraph mq["RabbitMQ"]
        submissions[["Birthday submissions queue"]]
        reminders[["Reminder messages queue"]]
    end

    subgraph coordinator_layer["Backend Coordinator"]
        coordinator["Backend Coordinator Application<br/>Spring Boot"]
        scheduler(("Daily scheduled job"))
    end

    db[("PostgreSQL")]

    email["Email service<br/>(owned by another team,<br/>not implemented)"]

    user --> ui
    ui -- "POST birthday (JSON)" --> api
    ui -- "GET birthdays / birthday by id (JSON)" --> api
    api -- "publish validated birthday" --> submissions
    submissions -- "consume" --> coordinator
    coordinator -- "write birthday" --> db
    api -- "read birthdays" --> db
    scheduler -. "triggers" .-> coordinator
    coordinator -- "check birthdays & reminder windows" --> db
    coordinator -- "publish reminder message" --> reminders
    reminders -. "consume" .-> email
```

**Write path:** UI → Backend API (validate) → RabbitMQ → Coordinator → PostgreSQL

**Read path:** UI → Backend API → PostgreSQL

**Reminder path:** Coordinator daily job → PostgreSQL (find birthdays inside their reminder window) → RabbitMQ → email service (external)

### Technology Decisions

#### Data Store: PostgreSQL

**Choice:** PostgreSQL.

**Reasoning:** Birthday records have a straightforward relational structure. PostgreSQL provides transactions, data integrity constraints, date types, and indexing without introducing unnecessary infrastructure.

**Trade-offs:** Both backend applications must agree on the shared schema. Schema changes need to be managed carefully.

#### Message Queue: RabbitMQ

**Choice:** RabbitMQ.

**Reasoning:** Durable queues, persistent messages, acknowledgements, and redelivery support reliable asynchronous processing when configured appropriately. This allows the API and coordinator to operate independently.

**Trade-offs:** Message delivery can be repeated, so consumers must handle duplicate messages safely. Broker persistence and application-level failure handling also need to be configured.

## Data Model

Both backends share one table, `birthdays`, defined in [`db/init/001_create_birthdays.sql`](db/init/001_create_birthdays.sql).

| Column                 | Type          | Notes                                                                 |
| ---------------------- | ------------- | --------------------------------------------------------------------- |
| `id`                   | `UUID` PK     | UUIDv7, generated by the Backend API, not the database (see below)    |
| `name`                 | `VARCHAR(200)` | Required                                                             |
| `birth_date`           | `DATE`        | Required; the API rejects future dates                                |
| `reminder_window_days` | `SMALLINT`    | Required; the API accepts 1–14 days before the birthday               |
| `reminder_email`       | `VARCHAR(200)` | Optional for now; who the email service should send the reminder to  |
| `next_reminder_on`     | `DATE`        | Required; when the next reminder is due. Maintained by the Coordinator |
| `created_at`           | `TIMESTAMPTZ` | Defaults to `now()`                                                   |
| `updated_at`           | `TIMESTAMPTZ` | Defaults to `now()`                                                   |

Indexes: primary key on `id`, `next_reminder_on` for the daily reminder job, `lower(name)` for name lookups, and `created_at DESC` for the default list order.

**Decisions:**

- **The API generates `id` as a UUIDv7.** The API puts the id in each submission message and can return it to the UI right away (`202 Accepted`). The Coordinator writes with `INSERT ... ON CONFLICT (id) DO NOTHING`, so a message RabbitMQ delivers twice still produces only one row. v7 UUIDs are time-ordered, which keeps the primary key index compact (random v4 UUIDs scatter inserts across it).
- **Each birthday stores a `reminder_email`.** The requirements don't say who receives reminder emails, but the email team's service needs a recipient, so each reminder message includes it. It's nullable for now, until the submission form collects it; how to handle reminders without a recipient is still to be decided. Once user accounts exist, this would become an owner reference.
- **The reminder schedule is stored as `next_reminder_on`, not computed each run.** The Coordinator computes it when it writes a birthday (`next birthday − reminder_window_days`). After it publishes a reminder, it moves the date to the following year's reminder. The daily job then just runs `WHERE next_reminder_on <= CURRENT_DATE`, which:
  - keeps the window maths and the February 29 rule (remind as if Feb 28 in non-leap years) in one place in the Coordinator, instead of in the query;
  - is a simple index lookup, with no month/day wrap-around at year end;
  - catches up automatically if the job misses a day, because overdue reminders still match `<=`;
  - is safe to rerun on the same day, because published rows have already moved to next year.
- **`birth_date` is a plain `DATE`.** A birthday has no time or time zone. The year is kept (useful for age), and reminder dates are based on month and day.
- **The API owns validation.** Value rules (non-blank name, no future birth dates, a 1–14 day window, a valid email) live in the API, the only entry point for submissions. The database has no `CHECK` constraints and enforces only types, `NOT NULL` and the 200-character limits. The trade-off: any other code that writes to the table directly (scripts, a future service) bypasses those rules.

**Trade-offs / future work:**

- **Publishing and updating aren't atomic.** If the Coordinator publishes a reminder and then fails before moving `next_reminder_on`, the next run sends it again. If it moves the date first and then publishing fails, the reminder is lost. A transactional outbox (save the outgoing message in the same transaction as the update, and publish it separately) would close this gap.
- **The init script only runs on a new volume.** That's fine for a local stack. Production schema changes should go through a migration tool such as Flyway, owned by one service.
