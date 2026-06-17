package repository

import (
	"database/sql"
	"testing"
)

func TestNewUserRepository(t *testing.T) {
	var db *sql.DB = nil
	repo := NewUserRepository(db)

	if repo == nil {
		t.Fatal("expected UserRepository to be created, got nil")
	}

	// Verify the underlying type matches the postgres implementation struct
	pgRepo, ok := repo.(*postgresUserRepository)
	if !ok {
		t.Errorf("expected repo to be *postgresUserRepository, got %T", repo)
	} else if pgRepo.db != nil {
		t.Errorf("expected inner DB client to be nil, got %v", pgRepo.db)
	}
}

func TestNewTodoRepository(t *testing.T) {
	var db *sql.DB = nil
	repo := NewTodoRepository(db)

	if repo == nil {
		t.Fatal("expected TodoRepository to be created, got nil")
	}

	// Verify the underlying type matches the postgres implementation struct
	pgRepo, ok := repo.(*postgresTodoRepository)
	if !ok {
		t.Errorf("expected repo to be *postgresTodoRepository, got %T", repo)
	} else if pgRepo.db != nil {
		t.Errorf("expected inner DB client to be nil, got %v", pgRepo.db)
	}
}
