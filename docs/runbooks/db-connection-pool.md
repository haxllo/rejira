# DB Connection Pool — Operational Runbook

**Applies to:** rejira-web (Next.js on Vercel → Supabase Postgres via PgBouncer)

---

## Pool Architecture

```
Vercel Function (per instance)            Supabase
┌──────────────────────────┐       ┌───────────────────┐
│  pg.Pool (max: 10)       │──────▶│  PgBouncer         │
│  statement_timeout: 5s   │       │  pool_mode: tx     │
│  idle_timeout: 30s       │       │  pool_size: 20     │
│  conn_timeout: 5s        │       │  max_clients: 100  │
└──────────────────────────┘       │         │          │
                                    │    Postgres 15     │
                                    │    max_connections │
                                    │    = 200           │
                                    └───────────────────┘
```

| Component | Setting | Value | Rationale |
|-----------|---------|-------|-----------|
| App pool | `max` | 10 | One Vercel function instance should never hold >10 connections; serverless execution time is capped |
| App pool | `statement_timeout` | 5s | Long-running queries are cancelled; the app returns 408 |
| App pool | `query_timeout` | 5s | Network-level timeout; same budget |
| App pool | `prepare: false` | — | PgBouncer transaction mode does not support prepared statements |
| PgBouncer | `pool_mode` | transaction | Connection returned to pool after each transaction; optimal for serverless |
| PgBouncer | `default_pool_size` | 20 | Per user/database pair |
| PgBouncer | `max_client_conn` | 100 | Caps total PgBouncer client connections |
| Postgres | `max_connections` | 200 (Supabase default) | Absolute ceiling |

---

## PgBouncer Modes

| Mode | Connection reuse | Prepared statements | Best for |
|------|-----------------|---------------------|----------|
| **transaction** (default) | After each transaction | Not supported | Serverless, high concurrency |
| **session** | After client disconnects | Supported | Long-lived connections, session state |

**Why transaction mode for rejira:** Each Vercel function invocation is short-lived. Functions borrow a connection for a single transaction and return it. This prevents connection hoarding across idle function instances.

**Consequence of `prepare: false`:** Drizzle's `query.prepare()` API is unavailable. The Drizzle client is initialized with `prepare: false` in `apps/web/lib/db/client.ts`. This is correct for transaction-mode PgBouncer.

---

## Pool Sizing

### Per-instance budget

Each Vercel function instance creates one `pg.Pool` with `max: 10`. When the function handles a request:

1. It borrows one connection from its local pool
2. The pool connects to PgBouncer (which holds a server connection for the duration of the transaction)
3. After the transaction, both connections return to their respective pools

### Scaling

- Vercel can spin up dozens of function instances under load
- Theoretical ceiling: `instance_count × 10 ≤ PgBouncer max_client_conn (100)`
- With 10 concurrent instances: `10 × 10 = 100` → PgBouncer is the bottleneck
- PgBouncer queues client connections that exceed `max_client_conn`
- Postgres `max_connections` (200) is the ultimate backstop

### Recommended sizing

| Tier | Vercel concurrency | App pool max | PgBouncer pool_size | PgBouncer max_client_conn |
|------|--------------------|---|---|---|
| Dev | 1 | 5 | 20 | 100 |
| Staging | 4 | 10 | 20 | 100 |
| Production | 10 | 10 | 20 | 100 |
| Production (high load) | 20 | 10 | 30 | 150 |

---

## Connection Exhaustion

### Symptoms

| Symptom | Likely cause |
|---------|-------------|
| Requests hang for 5s then return 408 | `statement_timeout` hit — slow query |
| Requests hang for 5s then throw `Connection terminated` | `connectionTimeoutMillis` hit — pool exhausted |
| `pg_stat_activity` shows many `idle in transaction` | Uncommitted transactions; possible connection leak |
| PgBouncer logs `no more connections allowed` | PgBouncer max_client_conn reached |
| Postgres logs `remaining connection slots are reserved` | Postgres max_connections reached |

### Diagnosis Query

Run against the **direct** database (port 5432 locally, or via Supabase SQL Editor):

```sql
SELECT
  state,
  count(*) as connections,
  string_agg(application_name, ', ') as apps,
  max(extract(epoch FROM now() - query_start)) as max_query_duration_s
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
GROUP BY state
ORDER BY count(*) DESC;
```

Check PgBouncer pool status (requires `pgbouncer` admin database):

```sql
SELECT database, state, count(*) FROM pgbouncer_clients GROUP BY database, state;
```

### Immediate Mitigation

1. **Kill hung queries:**
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'active'
     AND extract(epoch FROM now() - query_start) > 5;
   ```

2. **Bump PgBouncer pool size** (in `supabase/config.toml`, then `supabase db push`):
   ```toml
   [db.pooler]
   default_pool_size = 30
   ```

3. **Reduce concurrency:**
   - Lower Vercel function concurrency in Vercel dashboard
   - Lower app pool `max` from 10 to 5

---

## Escalation Path

| Threshold | Action | Who |
|-----------|--------|-----|
| `pg_stat_activity count(*) > 50` for 5+ minutes | Slack alert (#infra-alerts) | On-call engineer |
| `pg_stat_activity count(*) > 100` for 5+ minutes | PagerDuty page | Primary on-call |
| `pg_stat_activity count(*) > 150` for 2+ minutes | Incident declared | SRE lead |
| PgBouncer `no more connections` in logs | Check for connection leak; restart PgBouncer | Primary on-call |

### Connection Leak Investigation

1. Check for `idle in transaction` connections that never commit:
   ```sql
   SELECT pid, application_name, query, state_change
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
     AND extract(epoch FROM now() - state_change) > 30;
   ```

2. Check the app for unhandled promise rejections in transaction wrappers
3. Verify `statement_timeout = 5s` is set on all connections (protects against infinite loops)

---

## Monitoring

- **Sentry:** Alerts on `DbError` with `code: TIMEOUT`
- **Sentry:** Breadcrumbs per Drizzle query; warnings at >100ms
- **Supabase dashboard:** Database → Reports → Connections
- **pg_cron (Phase 4):** Nightly `pg_stat_activity` snapshot to audit table

### Health Check Endpoint

`GET /api/check` returns DB connection status. Expected response:

```json
{ "status": "ok", "db": "connected", "pool": { "total": 2, "idle": 1, "waiting": 0 } }
```

---

## References

- `apps/web/lib/db/client.ts` — Drizzle client with pool tuning
- `apps/web/lib/observability/sentry.ts` — Exception capture
- `supabase/config.toml` — PgBouncer configuration
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
