# 🎨 TaskI Frontend (React + Vite)

The frontend is a modern, responsive single-page application built using React, Vite, and Lucide Icons. It features an aesthetic liquid-glass card layout with smooth animations, custom contexts, and robust API interceptors.

---

## 📂 Project Layout

```text
├── src/
│   ├── components/          # Reusable UI Components & Modals
│   │   ├── ConfirmationModal.jsx   # Generic confirmation overlay
│   │   ├── Dashboard.jsx           # Main workspace and navigation panel
│   │   ├── LoginPage.jsx           # Secure authentication page
│   │   ├── ProfileModal.jsx        # Profile view and editing
│   │   ├── RegisterPage.jsx        # Account registration view
│   │   ├── TaskCard.jsx            # Individual task card layout
│   │   └── TaskModal.jsx           # Creation and editing form
│   ├── contexts/            # React Contexts (Global States)
│   │   ├── AuthContext.jsx         # Handles credentials, login/logout, and fetches
│   │   └── TodoContext.jsx         # CRUD operations for tasks
│   ├── App.jsx              # Routing and guard definitions
│   ├── index.css            # Custom CSS styling tokens and micro-animations
│   └── main.jsx             # DOM mounting and root setups
```

---

## 🔐 Rate-Limiting & Lockout Interceptor

The frontend handles HTTP `429 Too Many Requests` status codes globally inside `AuthContext.jsx`:

1.  **Session Termination**: If the backend issues a `429` status code on any network request, the interceptor immediately clears local auth states, nullifies the user context (`setUser(null)`), and forces a redirect to the login screen.
2.  **5-Minute Countdown Block**: The client-side interceptor stores a `lockout_until` timestamp in the browser's `localStorage` (set to 5 minutes from the block moment).
3.  **Local Request Blocking**: While the block is active, any attempt to authenticate, access profile, or load tasks is blocked *on the client-side* before hitting the network. The user is presented with a countdown indicating exactly how much time is remaining.

---

## 🧠 State Management & Contexts

*   **AuthContext**: Manages user authentication, checks token presence, registers users, updates profile fields, and manages the global fetch rate-limiting wrapper.
*   **TodoContext**: Manages active tasks, recently deleted items (Trash Bin), list categorization, task completion updates, and lists refreshing.

---

## ⚙️ Build and Execution

### Running Locally
To launch the frontend in development mode with hot-reloading:
1.  Navigate to the `apps/taski` directory:
    ```bash
    npm install
    ```
2.  Start the Vite local development server:
    ```bash
    npm run dev
    ```

### Building for Production
Vite builds and compiles the assets into static HTML/CSS/JS bundles:
```bash
npm run build
```
The resulting files are output to the `dist/` directory, which Nginx serves in the docker container.
