package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"todo-server/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// TokenBlacklist manages revoked JWT tokens in-memory (thread-safe)
type TokenBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time
}

var Blacklist = &TokenBlacklist{
	tokens: make(map[string]time.Time),
}

func (tb *TokenBlacklist) Add(tokenString string, expiresAt time.Time) {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.tokens[tokenString] = expiresAt
}

func (tb *TokenBlacklist) IsBlacklisted(tokenString string) bool {
	tb.mu.RLock()
	defer tb.mu.RUnlock()
	expiresAt, exists := tb.tokens[tokenString]
	if !exists {
		return false
	}
	if time.Now().After(expiresAt) {
		return false
	}
	return true
}

func (tb *TokenBlacklist) StartCleanupWorker() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			tb.mu.Lock()
			now := time.Now()
			for token, expiresAt := range tb.tokens {
				if now.After(expiresAt) {
					delete(tb.tokens, token)
				}
			}
			tb.mu.Unlock()
		}
	}()
}

// BlacklistToken extracts the expiration claim and blacklists the token
func BlacklistToken(tokenString string, jwtSecret []byte) {
	token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	expiresAt := time.Now().Add(24 * time.Hour) // Fallback max-age
	if token != nil {
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if exp, ok := claims["exp"].(float64); ok {
				expiresAt = time.Unix(int64(exp), 0)
			}
		}
	}
	Blacklist.Add(tokenString, expiresAt)
	slog.Info("JWT token explicitly revoked and blacklisted", "expiresAt", expiresAt)
}

// AuthMiddleware extracts the token from HttpOnly cookie and validates it
func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("token")
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"missing authentication token"}`))
				return
			}

			tokenString := cookie.Value

			// Security Check: Verify token signature has not been revoked (blacklisted)
			if Blacklist.IsBlacklisted(tokenString) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"token has been revoked (logged out)"}`))
				return
			}

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return cfg.JWTSecret, nil
			})

			if err != nil || !token.Valid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"invalid or expired token"}`))
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"invalid token claims"}`))
				return
			}

			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"invalid user subject in token"}`))
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CORSMiddleware configures CORS strictly based on config origins
func CORSMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := false

			for _, allowedOrigin := range cfg.CORSAllowedOrigins {
				if allowedOrigin == "*" || allowedOrigin == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					allowed = true
					break
				}
			}

			if !allowed && len(cfg.CORSAllowedOrigins) > 0 {
				w.Header().Set("Access-Control-Allow-Origin", cfg.CORSAllowedOrigins[0])
			}

			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			// Block state-changing requests if Origin is set but not allowed (CSRF/cross-origin protection)
			if origin != "" && !allowed {
				if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete || r.Method == http.MethodPatch {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusForbidden)
					_, _ = w.Write([]byte(`{"error":"CORS policy: cross-origin state changes are forbidden"}`))
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimiter manages rate limits per IP with a 5-minute lockout block on breach
type clientLimiter struct {
	limiter      *rate.Limiter
	lastSeen     time.Time
	blockedUntil time.Time
}

type RateLimiter struct {
	clients map[string]*clientLimiter
	mu      sync.Mutex
	rate    rate.Limit
	burst   int
}

func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*clientLimiter),
		rate:    r,
		burst:   b,
	}

	go rl.cleanupClients()

	return rl
}

func (rl *RateLimiter) allowClient(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	c, exists := rl.clients[ip]
	if !exists {
		c = &clientLimiter{
			limiter: rate.NewLimiter(rl.rate, rl.burst),
		}
		rl.clients[ip] = c
	}
	c.lastSeen = time.Now()

	// If currently blocked, deny
	if time.Now().Before(c.blockedUntil) {
		return false
	}

	// If rate limit is exceeded, set a 5-minute block and deny
	if !c.limiter.Allow() {
		c.blockedUntil = time.Now().Add(5 * time.Minute)
		slog.Warn("Rate limit exceeded; client IP temporarily blacklisted for 5 minutes", "ip", ip)
		return false
	}

	return true
}

func (rl *RateLimiter) cleanupClients() {
	for {
		time.Sleep(1 * time.Minute)
		rl.mu.Lock()
		for ip, client := range rl.clients {
			// Don't delete if they are currently blocked, or seen in the last 6 minutes
			if time.Now().Before(client.blockedUntil) || time.Since(client.lastSeen) < 6*time.Minute {
				continue
			}
			delete(rl.clients, ip)
		}
		rl.mu.Unlock()
	}
}

func RateLimitMiddleware(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getClientIP(r)
			if !rl.allowClient(ip) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"too many requests, rate limit exceeded"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getClientIP resolves the actual client IP address by checking trusted proxy headers first.
//
// X-Real-IP is checked before X-Forwarded-For because our nginx reverse proxy always
// overwrites X-Real-IP with the true connecting address ($remote_addr), whereas it
// appends to (rather than overwrites) any client-supplied X-Forwarded-For value via
// $proxy_add_x_forwarded_for. Trusting the first X-Forwarded-For entry would let a
// client spoof its own apparent IP and bypass per-IP rate limiting entirely. If
// X-Forwarded-For must be used, only the last entry (the one nginx appended) is trusted.
func getClientIP(r *http.Request) string {
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[len(parts)-1])
			if ip != "" {
				return ip
			}
		}
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// RecoveryMiddleware catches panics and prevents crashes
func RecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("panic recovered in HTTP handler pipeline", "error", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write([]byte(`{"error":"internal server error occurred"}`))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
