# Custom PostgreSQL image for TaskI.
#
# Schema migrations are applied explicitly via run.sh / `docker compose exec db psql`
# (see database/migrations/), not baked into this image's init scripts - this keeps
# schema changes auditable and version-controlled rather than implicit. This Dockerfile
# instead bakes in fintech-grade runtime hardening defaults that the bare upstream
# image doesn't set on its own:
#   - Defensive timeouts so a runaway query or an abandoned open transaction can't
#     hold locks or exhaust connections indefinitely.
#   - Audit-friendly connection and DDL logging, since this is the system of record
#     for user credentials and task data.
FROM postgres:16-alpine

HEALTHCHECK --interval=3s --timeout=3s --retries=5 \
    CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

CMD ["postgres", \
     "-c", "statement_timeout=30000", \
     "-c", "idle_in_transaction_session_timeout=60000", \
     "-c", "lock_timeout=10000", \
     "-c", "log_connections=on", \
     "-c", "log_disconnections=on", \
     "-c", "log_statement=ddl"]
