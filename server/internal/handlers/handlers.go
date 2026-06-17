package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"todo-server/internal/config"
	"todo-server/internal/middleware"
	"todo-server/internal/models"
	"todo-server/internal/services"
)

type Handler struct {
	cfg         *config.Config
	userService services.UserService
	todoService services.TodoService
}

func NewHandler(cfg *config.Config, uSvc services.UserService, tSvc services.TodoService) *Handler {
	return &Handler{
		cfg:         cfg,
		userService: uSvc,
		todoService: tSvc,
	}
}

// User Handlers
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	res, err := h.userService.Register(r.Context(), &req)
	if err != nil {
		if errors.Is(err, services.ErrEmailTaken) {
			h.respondWithError(w, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, services.ErrInvalidInput) {
			h.respondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	h.respondWithJSON(w, http.StatusCreated, res)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	token, userRes, err := h.userService.Login(r.Context(), &req, h.cfg.JWTSecret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			h.respondWithError(w, http.StatusUnauthorized, err.Error())
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Set HttpOnly secure cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400, // 24 hours
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteStrictMode,
	})

	h.respondWithJSON(w, http.StatusOK, userRes)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Clear JWT HttpOnly cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteStrictMode,
	})

	h.respondWithJSON(w, http.StatusOK, map[string]string{"message": "successfully logged out"})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		h.respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userRes, err := h.userService.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			h.respondWithError(w, http.StatusNotFound, "user not found")
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	h.respondWithJSON(w, http.StatusOK, userRes)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		h.respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	res, err := h.userService.UpdateProfile(r.Context(), userID, &req)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			h.respondWithError(w, http.StatusNotFound, "user not found")
			return
		}
		if errors.Is(err, services.ErrInvalidInput) {
			h.respondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrEmailTaken) {
			h.respondWithError(w, http.StatusConflict, "email is already registered")
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	h.respondWithJSON(w, http.StatusOK, res)
}


// Todo Handlers
func (h *Handler) GetTodos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var todos []*models.Todo
	var err error

	if r.URL.Query().Get("deleted") == "true" {
		todos, err = h.todoService.GetDeletedByUserID(r.Context(), userID)
	} else {
		todos, err = h.todoService.GetByUserID(r.Context(), userID)
	}

	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "failed to get todos")
		return
	}

	if todos == nil {
		todos = []*models.Todo{}
	}
	h.respondWithJSON(w, http.StatusOK, todos)
}

func (h *Handler) CreateTodo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var req models.CreateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	todo, err := h.todoService.Create(r.Context(), userID, &req)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondWithJSON(w, http.StatusCreated, todo)
}

func (h *Handler) GetTodoByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	todoID := r.URL.Query().Get("id")
	if todoID == "" {
		h.respondWithError(w, http.StatusBadRequest, "missing id parameter")
		return
	}

	todo, err := h.todoService.GetByID(r.Context(), userID, todoID)
	if err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			h.respondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrNotFound) {
			h.respondWithError(w, http.StatusNotFound, "todo not found")
			return
		}
		if errors.Is(err, services.ErrUnauthorized) {
			h.respondWithError(w, http.StatusForbidden, "unauthorized access to todo")
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "failed to fetch todo")
		return
	}

	h.respondWithJSON(w, http.StatusOK, todo)
}

func (h *Handler) UpdateTodo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	todoID := r.URL.Query().Get("id")
	if todoID == "" {
		h.respondWithError(w, http.StatusBadRequest, "missing id parameter")
		return
	}

	var req models.UpdateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	todo, err := h.todoService.Update(r.Context(), userID, todoID, &req)
	if err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			h.respondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrNotFound) {
			h.respondWithError(w, http.StatusNotFound, "todo not found")
			return
		}
		if errors.Is(err, services.ErrUnauthorized) {
			h.respondWithError(w, http.StatusForbidden, "unauthorized access to todo")
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "failed to update todo")
		return
	}

	h.respondWithJSON(w, http.StatusOK, todo)
}

func (h *Handler) DeleteTodo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		h.respondWithError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	todoID := r.URL.Query().Get("id")
	if todoID == "" {
		h.respondWithError(w, http.StatusBadRequest, "missing id parameter")
		return
	}

	var err error
	if r.URL.Query().Get("permanent") == "true" {
		err = h.todoService.HardDelete(r.Context(), userID, todoID)
	} else {
		err = h.todoService.Delete(r.Context(), userID, todoID)
	}

	if err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			h.respondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrNotFound) {
			h.respondWithError(w, http.StatusNotFound, "todo not found")
			return
		}
		if errors.Is(err, services.ErrUnauthorized) {
			h.respondWithError(w, http.StatusForbidden, "unauthorized access to todo")
			return
		}
		h.respondWithError(w, http.StatusInternalServerError, "failed to delete todo")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"message": "todo successfully deleted"})
}

// JSON helpers
func (h *Handler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

func (h *Handler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
