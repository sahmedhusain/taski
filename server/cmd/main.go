package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"todo-server/internal/config"
	"todo-server/internal/handlers"
	"todo-server/internal/middleware"
	"todo-server/internal/repository"
	"todo-server/internal/routes"
	"todo-server/internal/services"

	_ "github.com/lib/pq"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}

	// Initialize structured logger (JSON in production, Text in dev)
	var logger *slog.Logger
	if cfg.Environment == "production" {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	} else {
		logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	}
	slog.SetDefault(logger)

	slog.Info("Booting TaskI Go Core Engine...")

	// Security Check (SEC-07): Refuse to start in production with a default or low-entropy JWT secret.
	const defaultJWTSecret = "super_secure_jwt_secret_change_me_in_production"
	if cfg.Environment == "production" {
		if string(cfg.JWTSecret) == defaultJWTSecret {
			slog.Error("[SECURITY] JWT_SECRET is set to the well-known default fallback value in a production environment. Refusing to start.")
			os.Exit(1)
		}
		if len(cfg.JWTSecret) < 32 {
			slog.Error("[SECURITY] JWT_SECRET is too short for production use (minimum 32 bytes of entropy required). Refusing to start.")
			os.Exit(1)
		}
	} else if string(cfg.JWTSecret) == defaultJWTSecret {
		slog.Warn("[SECURITY WARNING] JWT_SECRET is set to the default fallback value. This is fine for local development only.")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)

	var db *sql.DB
	for i := 1; i <= 5; i++ {
		db, err = sql.Open("postgres", dsn)
		if err == nil {
			db.SetMaxOpenConns(25)
			db.SetMaxIdleConns(25)
			db.SetConnMaxLifetime(5 * time.Minute)

			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			err = db.PingContext(ctx)
			cancel()
			if err == nil {
				slog.Info("Successfully connected to PostgreSQL database connection pool.")
				break
			}
		}
		slog.Warn("Database connection attempt failed, retrying in 2 seconds...", "attempt", i, "error", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		slog.Error("Failed to connect to database after 5 attempts", "error", err)
		os.Exit(1)
	}

	userRepo := repository.NewUserRepository(db)
	todoRepo := repository.NewTodoRepository(db)

	userService := services.NewUserService(userRepo)
	todoService := services.NewTodoService(todoRepo)

	// Start JWT revocation map background clean up worker
	slog.Info("Starting background JWT blacklist cleanup worker...")
	middleware.Blacklist.StartCleanupWorker()

	// Background worker to purge soft-deleted tasks older than 30 days every 24 hours
	go func() {
		slog.Info("Starting background trash cleaner worker (interval: 24h)...")
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		// Run immediately on boot
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := todoService.CleanupDeleted(ctx); err != nil {
			slog.Warn("Background trash cleaner warning on initial boot cleanup", "error", err)
		} else {
			slog.Info("Background trash cleaner: initial cleanup completed successfully.")
		}
		cancel()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			if err := todoService.CleanupDeleted(ctx); err != nil {
				slog.Error("Background trash cleaner error during scheduled run", "error", err)
			}
			cancel()
		}
	}()

	handler := handlers.NewHandler(cfg, userService, todoService)
	router := routes.SetupRoutes(cfg, handler)

	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	server := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("HTTP Server is listening", "address", serverAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down HTTP Server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		_ = db.Close()
		os.Exit(1)
	}

	slog.Info("Gracefully closing PostgreSQL connection pool...")
	if err := db.Close(); err != nil {
		slog.Error("Error closing database connection pool", "error", err)
	} else {
		slog.Info("PostgreSQL connection pool closed successfully.")
	}

	slog.Info("TaskI Go Core Engine shut down cleanly.")
}
