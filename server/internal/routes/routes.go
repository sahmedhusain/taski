package routes

import (
	"net/http"
	"todo-server/internal/config"
	"todo-server/internal/handlers"
	"todo-server/internal/middleware"

	"golang.org/x/time/rate"
)

func SetupRoutes(cfg *config.Config, h *handlers.Handler) http.Handler {
	mux := http.NewServeMux()

	// Rate limiter (5 requests per second replenish, burst of 15)
	rl := middleware.NewRateLimiter(rate.Limit(5), 15)

	// Register public routes
	mux.HandleFunc("/api/auth/register", h.Register)
	mux.HandleFunc("/api/auth/login", h.Login)
	mux.HandleFunc("/api/auth/logout", h.Logout)

	authOnly := middleware.AuthMiddleware(cfg)

	mux.Handle("/api/auth/me", authOnly(http.HandlerFunc(h.Me)))
	mux.Handle("/api/auth/profile", authOnly(http.HandlerFunc(h.UpdateProfile)))
	mux.Handle("/api/todos", authOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.GetTodos(w, r)
		} else if r.Method == http.MethodPost {
			h.CreateTodo(w, r)
		} else {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = w.Write([]byte(`{"error":"method not allowed"}`))
		}
	})))

	mux.Handle("/api/todo", authOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.GetTodoByID(w, r)
		} else if r.Method == http.MethodPut || r.Method == http.MethodPatch {
			h.UpdateTodo(w, r)
		} else if r.Method == http.MethodDelete {
			h.DeleteTodo(w, r)
		} else {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = w.Write([]byte(`{"error":"method not allowed"}`))
		}
	})))

	// Build the handler chain
	var handler http.Handler = mux

	// Apply Rate Limiting, CORS, and Recovery globally
	handler = middleware.RateLimitMiddleware(rl)(handler)
	handler = middleware.CORSMiddleware(cfg)(handler)
	handler = middleware.RecoveryMiddleware(handler)

	return handler
}
