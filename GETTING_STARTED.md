# 🏁 Getting Started Guide

Follow this guide to spin up the local development environment, execute security verification scripts, and run performance benchmarks using Siege.

---

## 🛠️ Requirements

Ensure the following tools are installed on your machine:
*   [Docker](https://www.docker.com/) (with Docker Compose)
*   [Node.js](https://nodejs.org/) (for running local test scripts)
*   [Siege](https://github.com/JoeDog/siege) (optional, for stress-testing)

---

## 🚀 Running the Stack

1.  Clone the repository and navigate to the project directory.
2.  Start the multi-tier container services:
    ```bash
    docker compose up --build -d
    ```
    This launches:
    *   **PostgreSQL** (`todo-app-db-1`) on standard ports.
    *   **Go REST Backend** (`todo-app-backend-1`) running on port `8080`.
    *   **React Frontend Proxy** (`todo-app-frontend-1`) on port `3000` (`http://127.0.0.1:3000`).
    *   **pgAdmin** console (`todo-app-pgadmin-1`) on port `8085` (`http://127.0.0.1:8085`).

3.  Access the web application by opening [http://127.0.0.1:3000](http://127.0.0.1:3000) in your web browser.

4.  To stop the application stack:
    ```bash
    docker compose down
    ```

---

## 🧪 Running Security Verification Tests

We provide pre-packaged Node.js verification scripts to validate database rules, profile edits, and security constraints.

From the project root directory, run:

1.  **Run General Security Tests** (CORS origin checks, UUID validation, and rate limiter status):
    ```bash
    node tests/test_security.js
    ```
2.  **Run Profile Validation Tests** (DOB, age constraints, name format, and length checks):
    ```bash
    node tests/test_profile_validations.js
    ```
3.  **Run Email Conflict Check** (Verifying 409 status code on email updates):
    ```bash
    node tests/test_email_conflict.js
    ```

---

## ⚡ Siege Stress-Testing & Rate Limiter Verification

To test the backend IP rate-limiter bucket and the subsequent **5-minute lockout block**:

1.  **Install Siege**:
    *   On macOS: `brew install siege`
    *   On Linux: `sudo apt-get install siege`

2.  **Run a Stress Benchmark**:
    Send a concurrent burst of 25 requests to the login endpoint. Because the server limit is set to a burst size of 15, some requests will exceed the limit:
    ```bash
    siege -c25 -r1 -d1 "http://127.0.0.1:3000/api/auth/login POST {}"
    ```
    *Note: Always use `127.0.0.1` instead of `localhost` to ensure requests resolve directly to the IPv4 interface bound by Docker.*

3.  **Expected Output**:
    *   The first **15 requests** will return `401 Unauthorized` (due to dummy payload `{}` failing auth, indicating they hit the Go backend).
    *   The remaining **10 requests** will fail with `429 Too Many Requests`.
    *   Once a request returns `429`, the Go backend immediately blacklists your IP for **5 minutes**.

4.  **Confirm the Lockout Block**:
    Directly after running the Siege benchmark, make a single request via curl:
    ```bash
    curl -i -X POST -H "Content-Type: application/json" -d "{}" http://127.0.0.1:3000/api/auth/login
    ```
    **Expected Response**:
    ```http
    HTTP/1.1 429 Too Many Requests
    Content-Type: application/json

    {"error":"too many requests, rate limit exceeded"}
    ```
    Even though you only sent one request and the rate-limit bucket has replenished, your IP is blocked and cannot access the database or Auth handlers.
