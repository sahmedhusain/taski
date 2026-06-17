# 🖥️ Go Core Engine (Backend)

The backend is a high-performance Go REST API serving authentication, user profile management, list categorization, and todo operations.

---

## 📂 Project Structure

```text
├── cmd/
│   └── main.go              # Server entry point, database hookup, and graceful shutdown
└── internal/
    ├── config/              # Environment config loading and validation
    ├── handlers/            # HTTP handlers, JSON helpers, and audit logging
    ├── middleware/          # JWT auth, strict CORS, rate-limiting, and recovery
    ├── models/              # DTOs and database relational structures
    ├── repository/          # PostgreSQL repository mapping (SQL queries)
    └── services/            # Core business logic (encryption, verification)
```

---

## 🛡️ Core Middleware Implementations

*   **AuthMiddleware**: Extracts the JWT token from the secure `HttpOnly` cookie. Verifies signature against the `JWT_SECRET`. Checks the in-memory **TokenBlacklist** to ensure the token has not been revoked on logout.
*   **CORSMiddleware**: Restricts cross-origin requests. Enforces origin verification on mutating methods (`POST`, `PUT`, `DELETE`), blocking unrecognized origins before request processing.
*   **RateLimitMiddleware**: Implements IP-based rate limiting:
    *   Replenish Rate: 5 tokens per second.
    *   Burst Capacity: 15 tokens.
    *   Lockout Trigger: Any token depletion triggers a **5-minute blacklist** of the client IP, immediately rejecting subsequent calls with `429 Too Many Requests`.
*   **RecoveryMiddleware**: Recovers from runtime panics in Go handlers, logging panic traces via structured logs and returning a clean `500 Internal Server Error` response to the client.

---

## 🪵 Structured Logging & Audit Trail

The backend leverages Go's `log/slog` structured logging library:
*   **Production**: Writes records in **JSON format** to `stdout` for ingestion by collectors (ELK, Datadog).
*   **Development**: Writes records in **Text format** for readability.

#### Examples of Audit Logs:
```json
{"time":"2026-06-18T00:15:30Z","level":"INFO","msg":"Audit Log: New user registered","email":"user@domain.com","userID":"d3b07384-d113-4ec5-a50d-4b31a3848b5f"}
{"time":"2026-06-18T00:16:12Z","level":"INFO","msg":"Audit Log: User logged in","userID":"d3b07384-d113-4ec5-a50d-4b31a3848b5f","email":"user@domain.com"}
{"time":"2026-06-18T00:17:05Z","level":"WARN","msg":"Rate limit exceeded; client IP temporarily blacklisted for 5 minutes","ip":"198.51.100.42"}
```

---

## 🛢️ Database Connection Pooling

PostgreSQL connection parameters are tuned for production concurrency:
*   `MaxOpenConns`: 25 active connections.
*   `MaxIdleConns`: 25 idle connections.
*   `ConnMaxLifetime`: 5 minutes (prevents connection staleness and memory bloat).

---

## 🛠️ Local Execution & Testing

### Running Locally (Without Docker)
1. Ensure a local PostgreSQL server is active.
2. Configure environment variables in a `.env` file at the root.
3. Run the Go server:
   ```bash
   go run cmd/main.go
   ```

### Running Unit/Integration Tests
Run the Go unit tests inside the `server/` directory:
```bash
go test ./...
```
To run the Javascript integration security tests, see [GETTING_STARTED.md](../GETTING_STARTED.md).
