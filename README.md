# 📝 TaskI: Secure ToDo Application

A containerized ToDo application featuring a concurrent Go REST API backend and a responsive React frontend. The application is built with security in mind, featuring rate-limiting, temporary IP-based lockouts, and stateful JWT revocation on logout.

[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 📑 Table of Contents
- [📋 Project Overview](#-project-overview)
- [📸 Screenshots](#-screenshots)
- [🏗️ Architectural Decisions](#️-architectural-decisions)
- [🛠️ Tech Stack](#️-tech-stack)
- [📐 Logic & Flow](#-logic--flow)
- [📂 Directory Tree](#-directory-tree)
- [🚀 Setup & Execution](#-setup--execution)
- [⚙️ Environment Variables](#️-environment-variables)
- [🧠 Reflections & Limitations](#-reflections--limitations)
- [📈 Future Improvements](#-future-improvements)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👨‍💻 Author](#-author)

---

## 📋 Project Overview

**TaskI** is a task manager that allows users to organize their daily tasks inside customizable lists, collapsible sections, due dates, priorities, and a soft-delete Trash Bin.

*   **Core Workflow**: Users register and log in securely, create tasks with optional metadata (links, locations, flags, priority levels), group them into collapsible sections, and move completed or discarded items to a Trash Bin.
*   **State Management**: React Contexts manage authentication state and todo items independently.
*   **IP-Based Lockout**: Mutating API endpoints are rate-limited. Exceeding the rate limit triggers an immediate 5-minute IP block on both the backend and client-side to prevent request abuse.

---

## 📸 Screenshots

### 1. Main Dashboard View
![Dashboard](./screenshots/dashboard.png)

---

### 2. Add New Task Modal View
![Add New Task](./screenshots/newtask.png)

---

## 🏗️ Architectural Decisions

### Why React + Vite?
*   **Fast Development**: Vite's ESM-based hot-reloading makes the development feedback loop extremely fast.
*   **State Predictability**: React Contexts (`AuthContext` and `TodoContext`) manage authentication and task states cleanly without the boilerplate of Redux.

### Modular Component Architecture
To keep the codebase maintainable, the monolithic dashboard UI was refactored into modular sub-components:
*   **Dedicated Modals & Cards**: Split components into dedicated files: [TaskCard.jsx](file:///Users/sayed/Desktop/GitHub/todo-app/apps/taski/src/components/TaskCard.jsx) for rendering lists, [TaskModal.jsx](file:///Users/sayed/Desktop/GitHub/todo-app/apps/taski/src/components/TaskModal.jsx) for forms, [ProfileModal.jsx](file:///Users/sayed/Desktop/GitHub/todo-app/apps/taski/src/components/ProfileModal.jsx) for profiles, and [ConfirmationModal.jsx](file:///Users/sayed/Desktop/GitHub/todo-app/apps/taski/src/components/ConfirmationModal.jsx) for action prompts.
*   **Isolated State**: Input fields, forms, and validation states are kept local to their respective modals, preventing unnecessary re-renders of the main Dashboard workspace.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS (with custom Glassmorphic styling and transition animations)
*   **Icons**: Lucide React

### Backend
*   **Language**: Go (Golang)
*   **Architecture**: Domain-Driven Design (DDD) with routes, handlers, services, repositories, and models.
*   **Security**: IP-based rate-limiting, HttpOnly secure session cookies, token blacklist for immediate revocation, and Origin CORS checks.
*   **Database**: PostgreSQL with schema versioning managed via migrations.

---

## 📐 Logic & Flow

### 1. Rate-Limit Lockout Logic
```mermaid
graph TD
    A([Client Request]) --> B{Is Client IP Blocked?}
    B -->|Yes| C([Reject: HTTP 429])
    B -->|No| D[Check Token Bucket Limiter]
    
    D -->|Allowed| E[Pass to API Route Handlers]
    D -->|Exceeded Limit| F[Set BlockedUntil = Now + 5 Minutes]
    F --> G([Reject: HTTP 429 - Set Lockout])
```

### 2. User Journey (UX Flow)
```mermaid
sequenceDiagram
    participant User
    participant UI as React Frontend
    participant API as Go Backend
    participant DB as PostgreSQL
 
    User->>UI: Input Credentials
    UI->>API: POST /api/auth/login
    API->>DB: Check Hash & Match User
    API-->>UI: Set HttpOnly Cookie & Return User JSON
    UI->>UI: Mount Dashboard & Load Todo Context
    
    loop Todo Operations
        User->>UI: Toggle Task Checklist
        UI->>API: PUT /api/todo?id={id}
        API->>DB: Update Task State
        API-->>UI: Return Updated Task
    end
    
    User->>UI: Click Logout
    UI->>API: POST /api/auth/logout
    API->>API: Extract JWT & Add to Blacklist Map
    API-->>UI: Clear HttpOnly Cookie
    UI->>UI: Redirect to /login
```

### 3. Database Schema
```mermaid
erDiagram
    USERS ||--o{ TODOS : "owns"
    
    USERS {
        uuid id PK
        varchar email
        varchar full_name
        varchar password_hash
        varchar company_name
        varchar designation
        varchar department
        varchar date_of_birth
        timestamptz created_at
    }
    TODOS {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        boolean is_completed
        text url
        timestamptz due_date
        varchar due_time
        boolean is_urgent
        varchar list_name
        text tags
        boolean is_flagged
        varchar priority
        text location
        varchar section_name
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 📂 Directory Tree

```text
├── apps/
│   └── taski/                   # React (Vite) Frontend App
│       ├── public/              # Public Assets & Favicons
│       └── src/
│           ├── components/      # Modular UI Components & Modals
│           ├── contexts/        # Auth & Todo State Contexts
│           └── index.css        # Tailwind config & custom variables
├── database/                    # Database Schema & Migrations
│   └── migrations/              # SQL Migration scripts
├── server/                      # Go REST Backend Engine
│   ├── cmd/                     # Application entrypoint (main.go)
│   └── internal/                # Configuration, routes, handlers, and repositories
├── docker-compose.yml           # Container Orchestration
├── run.sh                       # Unified execution script
├── GETTING_STARTED.md           # Setup, running, and benchmarking guide
└── README.md                    
```

---

## 🚀 Setup & Execution

TaskI is containerized and easily deployed using Docker. Refer to **[GETTING_STARTED.md](GETTING_STARTED.md)** at the root directory for step-by-step setup, test scripts, and Siege stress-benchmarks.

---

## ⚙️ Environment Variables

The project uses a single `.env` file in the root directory (copy `.env.example` to get started):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Go REST API backend listener port | `8080` |
| `ENVIRONMENT` | Project execution context | `production` |
| `DB_HOST` | Database server address | `db` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | DB username | `postgres` |
| `DB_PASSWORD` | DB connection password | `postgres` |
| `DB_NAME` | Relational database name | `todo` |
| `DB_SSLMODE` | SSL security configuration | `disable` |
| `JWT_SECRET` | Secret key used to sign session cookies | **No safe default** — must be set to a unique, high-entropy value (`openssl rand -base64 32`). The backend refuses to start in production with the default or a short value. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:3000,http://localhost:5173` |
| `PGADMIN_EMAIL` | Login email for the local pgAdmin UI (bound to `127.0.0.1` only) | `admin@taski.com` |
| `PGADMIN_PASSWORD` | Login password for the local pgAdmin UI | `admin` |

---

## 🧠 Reflections & Limitations

*   **Modular Layout**: Breaking down the monolithic dashboard file made the codebase much easier to read and extend.
*   **Simple CSS & Tailwind**: Combining Tailwind utility classes with custom glassmorphism styles in `index.css` kept styling fast and lightweight.
*   **In-Memory Storage**: Lockouts and JWT blacklists are currently stored in Go server memory, which is appropriate for a single container but would lose state upon container restarts.

---

## 📈 Future Improvements

To move this architecture toward a production-grade scaling environment, we would look to implement the following changes:

1.  **Distributed State (Redis)**: Move the Token Blacklist and client IP rate-limit tracking map from Go server RAM into a shared Redis instance to maintain state across multiple container instances.
2.  **Advanced CSRF Mitigations**: Supplement `SameSite=Strict` cookie policies with an explicit Synchronizer Token Pattern (Anti-CSRF Tokens) for mutating requests.
3.  **Field-Level Encryption**: Enforce AES-256 encryption for task description bodies and user metadata before database writes.

---

## 🤝 Contributing
We welcome contributions! Here's how you can help:
1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly** - Ensure existing functionality still works
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## 👨‍💻 Author
**Sayed Ahmed Husain**
- **Email**: [sayedahmed97.sad@gmail.com](mailto:sayedahmed97.sad@gmail.com)
- **GitHub**: [sahmedhusain](https://github.com/sahmedhusain)
