package routes

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"todo-server/internal/config"
	"todo-server/internal/handlers"
	"todo-server/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

type mockUserService struct{}

func (m *mockUserService) Register(ctx context.Context, req *models.RegisterRequest) (*models.UserResponse, error) {
	return &models.UserResponse{ID: "user-123", Email: req.Email}, nil
}
func (m *mockUserService) Login(ctx context.Context, req *models.LoginRequest, jwtSecret []byte) (string, *models.UserResponse, error) {
	return "token", &models.UserResponse{ID: "user-123", Email: req.Email}, nil
}
func (m *mockUserService) GetUserByID(ctx context.Context, id string) (*models.UserResponse, error) {
	return &models.UserResponse{ID: id}, nil
}
func (m *mockUserService) UpdateProfile(ctx context.Context, userID string, req *models.UpdateProfileRequest) (*models.UserResponse, error) {
	return &models.UserResponse{ID: userID}, nil
}

type mockTodoService struct{}

func (m *mockTodoService) Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
	return &models.Todo{ID: "todo-123", UserID: userID}, nil
}
func (m *mockTodoService) GetByID(ctx context.Context, userID, id string) (*models.Todo, error) {
	return &models.Todo{ID: id, UserID: userID}, nil
}
func (m *mockTodoService) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return []*models.Todo{}, nil
}
func (m *mockTodoService) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return []*models.Todo{}, nil
}
func (m *mockTodoService) Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error) {
	return &models.Todo{ID: id, UserID: userID}, nil
}
func (m *mockTodoService) Delete(ctx context.Context, userID, id string) error     { return nil }
func (m *mockTodoService) HardDelete(ctx context.Context, userID, id string) error { return nil }
func (m *mockTodoService) Restore(ctx context.Context, userID, id string) error    { return nil }
func (m *mockTodoService) CleanupDeleted(ctx context.Context) error                { return nil }

func newTestHandler(cfg *config.Config) http.Handler {
	h := handlers.NewHandler(cfg, &mockUserService{}, &mockTodoService{})
	return SetupRoutes(cfg, h)
}

func authCookie(t *testing.T, secret []byte) *http.Cookie {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(1 * time.Hour).Unix(),
	})
	tokenStr, err := token.SignedString(secret)
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return &http.Cookie{Name: "token", Value: tokenStr}
}

func testConfig() *config.Config {
	return &config.Config{
		Environment:        "test",
		JWTSecret:          []byte("test-secret"),
		CORSAllowedOrigins: []string{"http://localhost:3000"},
	}
}

func TestSetupRoutes_PublicRoutes(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)

	tests := []struct {
		name   string
		path   string
		method string
		body   string
		want   int
	}{
		{"register without auth", "/api/auth/register", http.MethodPost, `{"email":"a@b.com","full_name":"A","password":"pw123456"}`, http.StatusCreated},
		{"login without auth", "/api/auth/login", http.MethodPost, `{"email":"a@b.com","password":"pw123456"}`, http.StatusOK},
		{"logout without auth", "/api/auth/logout", http.MethodPost, "", http.StatusOK},
		{"register wrong method", "/api/auth/register", http.MethodGet, "", http.StatusMethodNotAllowed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if w.Code != tt.want {
				t.Errorf("expected status %d, got %d", tt.want, w.Code)
			}
		})
	}
}

func TestSetupRoutes_ProtectedRoutesRequireAuth(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)

	paths := []string{"/api/auth/me", "/api/auth/profile", "/api/todos", "/api/todo"}

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected status 401 without auth cookie, got %d", w.Code)
			}
		})
	}
}

func TestSetupRoutes_TodosMethodDispatch(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)
	cookie := authCookie(t, cfg.JWTSecret)

	tests := []struct {
		name   string
		method string
		body   string
		want   int
	}{
		{"GET dispatches to GetTodos", http.MethodGet, "", http.StatusOK},
		{"POST dispatches to CreateTodo", http.MethodPost, `{"title":"Test todo"}`, http.StatusCreated},
		{"DELETE is not allowed", http.MethodDelete, "", http.StatusMethodNotAllowed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/todos", strings.NewReader(tt.body))
			req.AddCookie(cookie)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if w.Code != tt.want {
				t.Errorf("expected status %d, got %d", tt.want, w.Code)
			}
		})
	}
}

func TestSetupRoutes_TodoMethodDispatch(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)
	cookie := authCookie(t, cfg.JWTSecret)

	tests := []struct {
		name   string
		method string
		body   string
		want   int
	}{
		{"GET dispatches to GetTodoByID", http.MethodGet, "", http.StatusOK},
		{"PUT dispatches to UpdateTodo", http.MethodPut, `{"title":"Updated"}`, http.StatusOK},
		{"PATCH dispatches to UpdateTodo", http.MethodPatch, `{"title":"Updated"}`, http.StatusOK},
		{"DELETE dispatches to DeleteTodo", http.MethodDelete, "", http.StatusOK},
		{"POST is not allowed", http.MethodPost, "", http.StatusMethodNotAllowed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/todo?id=todo-123", strings.NewReader(tt.body))
			req.AddCookie(cookie)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if w.Code != tt.want {
				t.Errorf("expected status %d, got %d", tt.want, w.Code)
			}
		})
	}
}

func TestSetupRoutes_UnknownRoute(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/does-not-exist", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestSetupRoutes_GlobalMiddlewareApplied(t *testing.T) {
	cfg := testConfig()
	handler := newTestHandler(cfg)

	t.Run("CORS preflight handled globally", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/todos", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200 for CORS preflight, got %d", w.Code)
		}
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
			t.Errorf("expected CORS origin header to be set, got %q", got)
		}
	})

	t.Run("cross-origin state change blocked by CORS middleware", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", nil)
		req.Header.Set("Origin", "http://evil.example.com")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403 for disallowed cross-origin request, got %d", w.Code)
		}
	})
}
