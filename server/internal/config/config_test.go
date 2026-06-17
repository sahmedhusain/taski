package config

import (
	"os"
	"testing"
)

func TestLoadConfig_Fallbacks(t *testing.T) {
	// Clear env variables that might be set locally
	keys := []string{"PORT", "ENVIRONMENT", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_SSLMODE", "JWT_SECRET", "CORS_ALLOWED_ORIGINS"}
	for _, key := range keys {
		orig := os.Getenv(key)
		defer os.Setenv(key, orig)
		os.Unsetenv(key)
	}

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected error loading config: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected Port = 8080, got %s", cfg.Port)
	}
	if cfg.Environment != "development" {
		t.Errorf("expected Environment = development, got %s", cfg.Environment)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("expected DBHost = localhost, got %s", cfg.DBHost)
	}
	if string(cfg.JWTSecret) != "super_secure_jwt_secret_change_me_in_production" {
		t.Errorf("expected JWTSecret fallback, got %s", string(cfg.JWTSecret))
	}
	if len(cfg.CORSAllowedOrigins) != 2 || cfg.CORSAllowedOrigins[0] != "http://localhost:3000" {
		t.Errorf("expected default CORS origins, got %v", cfg.CORSAllowedOrigins)
	}
}

func TestLoadConfig_CustomEnv(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("ENVIRONMENT", "production")
	os.Setenv("DB_HOST", "db-server")
	os.Setenv("DB_PORT", "5433")
	os.Setenv("DB_USER", "custom-user")
	os.Setenv("DB_PASSWORD", "custom-pass")
	os.Setenv("DB_NAME", "custom-db")
	os.Setenv("DB_SSLMODE", "require")
	os.Setenv("JWT_SECRET", "another_secret")
	os.Setenv("CORS_ALLOWED_ORIGINS", "http://app.domain.com, http://admin.domain.com")

	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("ENVIRONMENT")
		os.Unsetenv("DB_HOST")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("DB_SSLMODE")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("CORS_ALLOWED_ORIGINS")
	}()

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected error loading config: %v", err)
	}

	if cfg.Port != "9090" {
		t.Errorf("expected Port = 9090, got %s", cfg.Port)
	}
	if cfg.Environment != "production" {
		t.Errorf("expected Environment = production, got %s", cfg.Environment)
	}
	if cfg.DBHost != "db-server" {
		t.Errorf("expected DBHost = db-server, got %s", cfg.DBHost)
	}
	if cfg.DBPort != "5433" {
		t.Errorf("expected DBPort = 5433, got %s", cfg.DBPort)
	}
	if cfg.DBUser != "custom-user" {
		t.Errorf("expected DBUser = custom-user, got %s", cfg.DBUser)
	}
	if cfg.DBPassword != "custom-pass" {
		t.Errorf("expected DBPassword = custom-pass, got %s", cfg.DBPassword)
	}
	if cfg.DBName != "custom-db" {
		t.Errorf("expected DBName = custom-db, got %s", cfg.DBName)
	}
	if cfg.DBSSLMode != "require" {
		t.Errorf("expected DBSSLMode = require, got %s", cfg.DBSSLMode)
	}
	if string(cfg.JWTSecret) != "another_secret" {
		t.Errorf("expected JWTSecret = another_secret, got %s", string(cfg.JWTSecret))
	}
	if len(cfg.CORSAllowedOrigins) != 2 || cfg.CORSAllowedOrigins[0] != "http://app.domain.com" || cfg.CORSAllowedOrigins[1] != "http://admin.domain.com" {
		t.Errorf("expected custom CORS origins, got %v", cfg.CORSAllowedOrigins)
	}
}
