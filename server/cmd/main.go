package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"todo-server/internal/config"
	"todo-server/internal/handlers"
	"todo-server/internal/repository"
	"todo-server/internal/routes"
	"todo-server/internal/services"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("Booting TaskI Go Core Engine...")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
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
				log.Println("Successfully connected to PostgreSQL database connection pool.")
				break
			}
		}
		log.Printf("Database connection attempt %d failed, retrying in 2 seconds...", i)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	userRepo := repository.NewUserRepository(db)
	todoRepo := repository.NewTodoRepository(db)

	userService := services.NewUserService(userRepo)
	todoService := services.NewTodoService(todoRepo)

	// Background worker to purge soft-deleted reminders older than 30 days every 24 hours
	go func() {
		log.Println("Starting background trash cleaner worker (interval: 24h)...")
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		// Run immediately on boot
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := todoService.CleanupDeleted(ctx); err != nil {
			log.Printf("Background trash cleaner warning: %v", err)
		} else {
			log.Println("Background trash cleaner: initial cleanup completed successfully.")
		}
		cancel()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			if err := todoService.CleanupDeleted(ctx); err != nil {
				log.Printf("Background trash cleaner error: %v", err)
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
		log.Printf("HTTP Server is listening on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down HTTP Server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("TaskI Go Core Engine shut down cleanly.")
}
