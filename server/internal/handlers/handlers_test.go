package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"todo-server/internal/config"
	"todo-server/internal/middleware"
	"todo-server/internal/models"
)

type mockUserService struct {
	registerFn      func(ctx context.Context, req *models.RegisterRequest) (*models.UserResponse, error)
	loginFn         func(ctx context.Context, req *models.LoginRequest, jwtSecret []byte) (string, *models.UserResponse, error)
	getUserByIDFn   func(ctx context.Context, id string) (*models.UserResponse, error)
	updateProfileFn func(ctx context.Context, userID string, req *models.UpdateProfileRequest) (*models.UserResponse, error)
}

func (m *mockUserService) Register(ctx context.Context, req *models.RegisterRequest) (*models.UserResponse, error) {
	return m.registerFn(ctx, req)
}
func (m *mockUserService) Login(ctx context.Context, req *models.LoginRequest, jwtSecret []byte) (string, *models.UserResponse, error) {
	return m.loginFn(ctx, req, jwtSecret)
}
func (m *mockUserService) GetUserByID(ctx context.Context, id string) (*models.UserResponse, error) {
	return m.getUserByIDFn(ctx, id)
}
func (m *mockUserService) UpdateProfile(ctx context.Context, userID string, req *models.UpdateProfileRequest) (*models.UserResponse, error) {
	return m.updateProfileFn(ctx, userID, req)
}

type mockTodoService struct {
	createFn             func(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error)
	getByIDFn            func(ctx context.Context, userID, id string) (*models.Todo, error)
	getByUserIDFn        func(ctx context.Context, userID string) ([]*models.Todo, error)
	getDeletedByUserIDFn func(ctx context.Context, userID string) ([]*models.Todo, error)
	updateFn             func(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error)
	deleteFn             func(ctx context.Context, userID, id string) error
	hardDeleteFn         func(ctx context.Context, userID, id string) error
	restoreFn            func(ctx context.Context, userID, id string) error
	cleanupDeletedFn     func(ctx context.Context) error
}

func (m *mockTodoService) Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
	return m.createFn(ctx, userID, req)
}
func (m *mockTodoService) GetByID(ctx context.Context, userID, id string) (*models.Todo, error) {
	return m.getByIDFn(ctx, userID, id)
}
func (m *mockTodoService) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return m.getByUserIDFn(ctx, userID)
}
func (m *mockTodoService) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return m.getDeletedByUserIDFn(ctx, userID)
}
func (m *mockTodoService) Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error) {
	return m.updateFn(ctx, userID, id, req)
}
func (m *mockTodoService) Delete(ctx context.Context, userID, id string) error {
	return m.deleteFn(ctx, userID, id)
}
func (m *mockTodoService) HardDelete(ctx context.Context, userID, id string) error {
	return m.hardDeleteFn(ctx, userID, id)
}
func (m *mockTodoService) Restore(ctx context.Context, userID, id string) error {
	return m.restoreFn(ctx, userID, id)
}
func (m *mockTodoService) CleanupDeleted(ctx context.Context) error {
	return m.cleanupDeletedFn(ctx)
}

func TestHandler_Register(t *testing.T) {
	cfg := &config.Config{}
	uSvc := &mockUserService{}
	tSvc := &mockTodoService{}
	h := NewHandler(cfg, uSvc, tSvc)

	t.Run("Invalid method", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/auth/register", nil)
		w := httptest.NewRecorder()
		h.Register(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", w.Code)
		}
	})

	t.Run("Success", func(t *testing.T) {
		uSvc.registerFn = func(ctx context.Context, req *models.RegisterRequest) (*models.UserResponse, error) {
			return &models.UserResponse{
				ID:    "user-123",
				Email: req.Email,
			}, nil
		}

		payload := []byte(`{"email":"test@test.com","fullName":"Test User","password":"Password123!"}`)
		req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(payload))
		w := httptest.NewRecorder()
		h.Register(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w.Code)
		}

		var res models.UserResponse
		_ = json.NewDecoder(w.Body).Decode(&res)
		if res.ID != "user-123" {
			t.Errorf("expected user ID 'user-123', got %s", res.ID)
		}
	})
}

func TestHandler_Login(t *testing.T) {
	cfg := &config.Config{JWTSecret: []byte("secret")}
	uSvc := &mockUserService{}
	tSvc := &mockTodoService{}
	h := NewHandler(cfg, uSvc, tSvc)

	t.Run("Success and sets HttpOnly Cookie", func(t *testing.T) {
		uSvc.loginFn = func(ctx context.Context, req *models.LoginRequest, jwtSecret []byte) (string, *models.UserResponse, error) {
			return "my-signed-token", &models.UserResponse{ID: "user-123", Email: req.Email}, nil
		}

		payload := []byte(`{"email":"test@test.com","password":"Password123!"}`)
		req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(payload))
		w := httptest.NewRecorder()
		h.Login(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		// Verify cookie is set
		cookies := w.Result().Cookies()
		var tokenCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "token" {
				tokenCookie = c
				break
			}
		}

		if tokenCookie == nil {
			t.Fatal("expected 'token' cookie to be set, but was not found")
		}
		if tokenCookie.Value != "my-signed-token" {
			t.Errorf("expected cookie value 'my-signed-token', got %s", tokenCookie.Value)
		}
		if !tokenCookie.HttpOnly {
			t.Errorf("expected cookie to be HttpOnly")
		}
	})
}

func TestHandler_Logout(t *testing.T) {
	cfg := &config.Config{JWTSecret: []byte("secret")}
	uSvc := &mockUserService{}
	tSvc := &mockTodoService{}
	h := NewHandler(cfg, uSvc, tSvc)

	t.Run("Success clears cookie", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/auth/logout", nil)
		req.AddCookie(&http.Cookie{Name: "token", Value: "existing-token"})
		w := httptest.NewRecorder()
		h.Logout(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		// Verify cookie is cleared
		cookies := w.Result().Cookies()
		var tokenCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "token" {
				tokenCookie = c
				break
			}
		}

		if tokenCookie == nil {
			t.Fatal("expected 'token' cookie to be returned to clear it")
		}
		if tokenCookie.Value != "" {
			t.Errorf("expected empty cookie value, got %s", tokenCookie.Value)
		}
		if tokenCookie.MaxAge != -1 {
			t.Errorf("expected MaxAge to be -1, got %d", tokenCookie.MaxAge)
		}
	})
}

func TestHandler_Me(t *testing.T) {
	cfg := &config.Config{}
	uSvc := &mockUserService{}
	tSvc := &mockTodoService{}
	h := NewHandler(cfg, uSvc, tSvc)

	t.Run("Success with user context", func(t *testing.T) {
		uSvc.getUserByIDFn = func(ctx context.Context, id string) (*models.UserResponse, error) {
			if id != "user-123" {
				return nil, errors.New("unexpected user ID")
			}
			return &models.UserResponse{ID: id, Email: "me@test.com"}, nil
		}

		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-123")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.Me(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var res models.UserResponse
		_ = json.NewDecoder(w.Body).Decode(&res)
		if res.Email != "me@test.com" {
			t.Errorf("expected email 'me@test.com', got %s", res.Email)
		}
	})

	t.Run("Unauthorized when context missing", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		w := httptest.NewRecorder()
		h.Me(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})
}

func TestHandler_Todos(t *testing.T) {
	cfg := &config.Config{}
	uSvc := &mockUserService{}
	tSvc := &mockTodoService{}
	h := NewHandler(cfg, uSvc, tSvc)

	t.Run("Get active todos", func(t *testing.T) {
		tSvc.getByUserIDFn = func(ctx context.Context, userID string) ([]*models.Todo, error) {
			return []*models.Todo{
				{ID: "todo-1", Title: "Task 1", UserID: userID},
			}, nil
		}

		req := httptest.NewRequest("GET", "/api/todos", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-123")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.GetTodos(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var res []*models.Todo
		_ = json.NewDecoder(w.Body).Decode(&res)
		if len(res) != 1 || res[0].Title != "Task 1" {
			t.Errorf("expected 1 task titled 'Task 1'")
		}
	})

	t.Run("Create todo", func(t *testing.T) {
		tSvc.createFn = func(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
			return &models.Todo{
				ID:          "todo-2",
				UserID:      userID,
				Title:       req.Title,
				Description: req.Description,
			}, nil
		}

		payload := []byte(`{"title":"Task 2","description":"Task 2 description"}`)
		req := httptest.NewRequest("POST", "/api/todos", bytes.NewBuffer(payload))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-123")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.CreateTodo(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w.Code)
		}

		var res models.Todo
		_ = json.NewDecoder(w.Body).Decode(&res)
		if res.ID != "todo-2" || res.Title != "Task 2" {
			t.Errorf("expected todo ID 'todo-2' and Title 'Task 2'")
		}
	})
}
