package repository

import (
	"context"
	"todo-server/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
}

type TodoRepository interface {
	Create(ctx context.Context, todo *models.Todo) error
	GetByID(ctx context.Context, id string) (*models.Todo, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error)
	Update(ctx context.Context, todo *models.Todo) error
	Delete(ctx context.Context, id string) error
}
