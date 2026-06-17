# 🖥️ Go Core Engine (Backend)

The backend is a high-performance Go REST API serving authentication, user profile management, section configuration, and todo operations.

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

## 🛡️ Core Middleware

*   **AuthMiddleware**: Extracts the JWT token from the secure `HttpOnly` cookie. Verifies the signature against the `JWT_SECRET` and checks the in-memory `TokenBlacklist` map to ensure the token hasn't been revoked via a logout action.
*   **CORSMiddleware**: Restricts cross-origin requests. Verifies the request origin for mutating methods (`POST`, `PUT`, `DELETE`), blocking unrecognized origins.
*   **RateLimitMiddleware**: Implements IP-based rate limiting:
    *   Replenish Rate: 5 tokens per second.
    *   Burst Capacity: 15 tokens.
    *   Lockout Trigger: Any token depletion triggers a **5-minute blacklist** of the client IP, immediately rejecting subsequent calls with `429 Too Many Requests`.
*   **RecoveryMiddleware**: Recovers from runtime panics in handlers, logging the stack traces and returning a clean `500 Internal Server Error`.

---

## 🪵 Logging & Audit Trails

The backend uses Go's `log/slog` structured logging library:
*   **JSON Format**: In production, logs are printed in JSON format to stdout for easy parsing by monitoring systems.
*   **Audit Messages**: Security mutations (registration, login, logout, profile updates, and rate-limit triggers) print audit trails.

---

## 🧪 Local Execution & Testing

### Running Go Unit Tests
Run tests inside the `server/` directory:
```bash
go test -v ./...
```

### Running Server Directly (Without Docker)
1. Configure environment variables in a `.env` file at the root.
2. Run the main file:
   ```bash
   go run cmd/main.go
   ```

---

## 📡 API Endpoints & Curl Examples

All responses return JSON payloads. Cookies (`token`) are set as `HttpOnly` and `SameSite=Strict`.

### 1. Authentication & Profile

*   **Register User**:
    ```bash
    curl -i -X POST -H "Content-Type: application/json" \
      -d '{"email":"test@domain.com","password":"Password123!","full_name":"Test User"}' \
      http://127.0.0.1:3000/api/auth/register
    ```

*   **Login**:
    ```bash
    curl -i -X POST -H "Content-Type: application/json" \
      -d '{"email":"test@domain.com","password":"Password123!"}' \
      http://127.0.0.1:3000/api/auth/login
    ```

*   **Logout**:
    ```bash
    curl -i -X POST -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/auth/logout
    ```

*   **Get Profile**:
    ```bash
    curl -i -X GET -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/auth/profile
    ```

*   **Update Profile**:
    ```bash
    curl -i -X PUT -H "Content-Type: application/json" -b "token=PASTE_TOKEN_HERE" \
      -d '{"email":"test@domain.com","full_name":"Updated Name","company_name":"Company Co","designation":"Lead Dev","department":"Eng","date_of_birth":"1995-10-15"}' \
      http://127.0.0.1:3000/api/auth/profile
    ```

### 2. Todo Operations

*   **Get All Todos**:
    ```bash
    curl -i -X GET -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/todo
    ```

*   **Create Todo**:
    ```bash
    curl -i -X POST -H "Content-Type: application/json" -b "token=PASTE_TOKEN_HERE" \
      -d '{"title":"New Task","description":"Detailed notes","url":"","due_date":"2026-06-25T00:00:00Z","due_time":"","is_urgent":false,"list_name":"Todos","tags":"","is_flagged":false,"priority":"None","location":"","section_name":""}' \
      http://127.0.0.1:3000/api/todo
    ```

*   **Update Todo**:
    ```bash
    curl -i -X PUT -H "Content-Type: application/json" -b "token=PASTE_TOKEN_HERE" \
      -d '{"title":"Updated Task Title","description":"Updated notes","is_completed":true}' \
      http://127.0.0.1:3000/api/todo?id=TODO_UUID_HERE
    ```

*   **Soft Delete Todo (Move to Trash)**:
    ```bash
    curl -i -X DELETE -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/todo?id=TODO_UUID_HERE
    ```

*   **Hard Delete Todo (Permanently Delete)**:
    ```bash
    curl -i -X DELETE -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/todo?id=TODO_UUID_HERE\&permanent=true
    ```

*   **Restore Todo from Trash**:
    ```bash
    curl -i -X PUT -H "Content-Type: application/json" -b "token=PASTE_TOKEN_HERE" \
      -d '{"deleted_at":null}' \
      http://127.0.0.1:3000/api/todo?id=TODO_UUID_HERE
    ```

*   **Empty Trash Bin**:
    ```bash
    curl -i -X DELETE -b "token=PASTE_TOKEN_HERE" \
      http://127.0.0.1:3000/api/todo/trash
    ```
