package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"todo-server/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"
)

func TestTokenBlacklist(t *testing.T) {
	// Clean/reset the global blacklist before testing
	Blacklist.mu.Lock()
	Blacklist.tokens = make(map[string]time.Time)
	Blacklist.mu.Unlock()

	token := "some-revoked-token"
	
	if Blacklist.IsBlacklisted(token) {
		t.Errorf("token should not be blacklisted initially")
	}

	// Add with future expiration
	Blacklist.Add(token, time.Now().Add(1*time.Hour))
	if !Blacklist.IsBlacklisted(token) {
		t.Errorf("token should be blacklisted")
	}

	// Add with past expiration
	expiredToken := "expired-token"
	Blacklist.Add(expiredToken, time.Now().Add(-1*time.Hour))
	if Blacklist.IsBlacklisted(expiredToken) {
		t.Errorf("expired token should not be reported as blacklisted")
	}
}

func TestBlacklistToken(t *testing.T) {
	Blacklist.mu.Lock()
	Blacklist.tokens = make(map[string]time.Time)
	Blacklist.mu.Unlock()

	secret := []byte("secret")
	claims := jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString(secret)

	BlacklistToken(tokenStr, secret)

	if !Blacklist.IsBlacklisted(tokenStr) {
		t.Errorf("expected token to be blacklisted after BlacklistToken call")
	}
}

func TestAuthMiddleware(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: []byte("my-test-secret"),
	}

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify context contains userID
		val := r.Context().Value(UserIDKey)
		if val == nil {
			t.Errorf("expected UserID in context, got nil")
		} else if val.(string) != "user-123" {
			t.Errorf("expected UserID to be 'user-123', got %s", val.(string))
		}
		w.WriteHeader(http.StatusOK)
	})

	mw := AuthMiddleware(cfg)(nextHandler)

	t.Run("Missing cookie", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("Invalid token signature", func(t *testing.T) {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": "user-123",
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		})
		tokenStr, _ := token.SignedString([]byte("wrong-secret"))

		req := httptest.NewRequest("GET", "/", nil)
		req.AddCookie(&http.Cookie{Name: "token", Value: tokenStr})
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("Valid token", func(t *testing.T) {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": "user-123",
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		})
		tokenStr, _ := token.SignedString(cfg.JWTSecret)

		req := httptest.NewRequest("GET", "/", nil)
		req.AddCookie(&http.Cookie{Name: "token", Value: tokenStr})
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("Blacklisted token", func(t *testing.T) {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": "user-123",
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		})
		tokenStr, _ := token.SignedString(cfg.JWTSecret)

		Blacklist.Add(tokenStr, time.Now().Add(1*time.Hour))
		defer func() {
			Blacklist.mu.Lock()
			delete(Blacklist.tokens, tokenStr)
			Blacklist.mu.Unlock()
		}()

		req := httptest.NewRequest("GET", "/", nil)
		req.AddCookie(&http.Cookie{Name: "token", Value: tokenStr})
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})
}

func TestCORSMiddleware(t *testing.T) {
	cfg := &config.Config{
		CORSAllowedOrigins: []string{"http://localhost:3000"},
	}

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CORSMiddleware(cfg)(nextHandler)

	t.Run("Allowed Origin GET", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
			t.Errorf("expected Access-Control-Allow-Origin header to be set")
		}
		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("Disallowed Origin GET (allowed but with fallback origin header set)", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Origin", "http://evil.com")
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
			t.Errorf("expected Access-Control-Allow-Origin header to fallback to CORSAllowedOrigins[0]")
		}
		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("Disallowed Origin POST (blocked state changes)", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/", nil)
		req.Header.Set("Origin", "http://evil.com")
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", w.Code)
		}
	})

	t.Run("OPTIONS Preflight request", func(t *testing.T) {
		req := httptest.NewRequest("OPTIONS", "/", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
		if w.Header().Get("Access-Control-Allow-Methods") == "" {
			t.Errorf("expected CORS methods headers to be set")
		}
	})
}

func TestRateLimiter(t *testing.T) {
	// Create limiter with very low limits (1 request per second, burst 1)
	rl := NewRateLimiter(rate.Limit(1), 1)

	ip := "192.168.1.1"

	// First request should be allowed
	if !rl.allowClient(ip) {
		t.Errorf("expected first request to be allowed")
	}

	// Second request immediately after should exceed rate limit and cause a block
	if rl.allowClient(ip) {
		t.Errorf("expected second request to be rate limited/blocked")
	}

	// Check that they are indeed blocked (blockedUntil is in the future)
	rl.mu.Lock()
	client, exists := rl.clients[ip]
	rl.mu.Unlock()

	if !exists || time.Now().After(client.blockedUntil) {
		t.Errorf("expected client to be blocked in clientLimiter map")
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	rl := NewRateLimiter(rate.Limit(10), 10)
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := RateLimitMiddleware(rl)(nextHandler)

	t.Run("Allow request", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("Get client IP from X-Forwarded-For uses last (proxy-appended) entry", func(t *testing.T) {
		// The leftmost entries in X-Forwarded-For are attacker-controlled; only the
		// last entry (appended by our trusted nginx proxy) is trustworthy.
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-Forwarded-For", "5.6.7.8, 9.10.11.12")
		ip := getClientIP(req)
		if ip != "9.10.11.12" {
			t.Errorf("expected client IP to be parsed as '9.10.11.12', got %s", ip)
		}
	})

	t.Run("Get client IP prefers X-Real-IP over X-Forwarded-For", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-Forwarded-For", "5.6.7.8, 9.10.11.12")
		req.Header.Set("X-Real-IP", "203.0.113.7")
		ip := getClientIP(req)
		if ip != "203.0.113.7" {
			t.Errorf("expected client IP to be parsed as '203.0.113.7', got %s", ip)
		}
	})
}

func TestRecoveryMiddleware(t *testing.T) {
	panicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went critically wrong")
	})

	mw := RecoveryMiddleware(panicHandler)

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	// It should recover and not crash the test execution
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("RecoveryMiddleware did not recover from panic: %v", r)
		}
	}()

	mw.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 on panic recovery, got %d", w.Code)
	}
}
