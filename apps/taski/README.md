# 🎨 TaskI Frontend (React + Vite)

A modern, responsive single-page application built with React, Vite, Tailwind CSS, and Lucide Icons. It features an Apple-inspired glassmorphic card layout, custom context state managers, and global API rate-limit interceptors.

---

## 📂 Project Layout

```text
├── src/
│   ├── components/          # UI Components & Modals
│   │   ├── ConfirmationModal.jsx   # Double-confirm alerts (logout, deletes)
│   │   ├── Dashboard.jsx           # Sidebar lists, collapsible categories, and workspace
│   │   ├── LoginPage.jsx           # Sign in view
│   │   ├── ProfileModal.jsx        # Edit profile information
│   │   ├── RegisterPage.jsx        # Create account view
│   │   ├── TaskCard.jsx            # Individual todo list rows
│   │   └── TaskModal.jsx           # Add/Edit task forms
│   ├── contexts/            # Global State managers
│   │   ├── AuthContext.jsx         # User identity, fetch wrapper, and lockout timers
│   │   └── TodoContext.jsx         # Active & deleted todos CRUD caching
│   ├── App.jsx              # Navigation and Protected Route Guards
│   ├── index.css            # Tailwind directives & glassmorphic custom variables
│   └── main.jsx             # DOM mounting setup
```

---

## 🔐 Rate-Limiting & Lockout Interceptor

The frontend handles API `429 Too Many Requests` responses globally inside `AuthContext.jsx`:

1.  **Session Invalidation**: If the server returns a `429` status code on any network request, the interceptor immediately signs out the user, clears the state (`setUser(null)`), and redirects them to the login screen.
2.  **5-Minute Countdown Block**: The interceptor writes a `lockout_until` timestamp to browser `localStorage` (calculated as 5 minutes from the block moment).
3.  **Local Request Blocking**: While the block is active, any attempt to register, log in, or fetch profiles is intercepted on the client-side before hitting the network. The user is presented with a countdown timer indicating when the lockout will expire.

---

## 🚦 Routing & Route Guards

Navigation is defined inside [App.jsx](file:///Users/sayed/Desktop/GitHub/todo-app/apps/taski/src/App.jsx):
*   **Public Routes**: `/login` and `/register` are accessible to unauthenticated users. If a logged-in user visits them, they are redirected to the dashboard.
*   **Protected Routes**: The main root route `/` requires a valid authenticated user session. Unauthenticated users are redirected back to `/login`.

---

## ⚙️ Development & Build Scripts

### 1. Running Locally (Development Mode)
To launch the hot-reloading development server:
1. Navigate to the frontend directory:
   ```bash
   cd apps/taski
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development command:
   ```bash
   npm run dev
   ```

### 2. Building for Production
To compile the frontend project:
```bash
npm run build
```
Vite builds the assets into the `dist/` directory. These static files are loaded by Nginx in the production Docker image.

### 3. Local Integration Verification Scripts
You can run automated test scripts from the root directory to verify validations and security logic:
*   `node .gemini/antigravity/brain/dea85a4f-54e3-482f-89b3-e7bc2fe1f528/scratch/test_security.js`
*   `node .gemini/antigravity/brain/dea85a4f-54e3-482f-89b3-e7bc2fe1f528/scratch/test_profile_validations.js`
*   `node .gemini/antigravity/brain/dea85a4f-54e3-482f-89b3-e7bc2fe1f528/scratch/test_email_conflict.js`
