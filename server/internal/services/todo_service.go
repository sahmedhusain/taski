package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"todo-server/internal/models"
	"todo-server/internal/repository"

	"github.com/google/uuid"
)

type TodoService interface {
	Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error)
	GetByID(ctx context.Context, userID, id string) (*models.Todo, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error)
	Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error)
	Delete(ctx context.Context, userID, id string) error
}

type todoService struct {
	todoRepo repository.TodoRepository
}

func NewTodoService(todoRepo repository.TodoRepository) TodoService {
	return &todoService{todoRepo: todoRepo}
}

func (s *todoService) Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.New("title cannot be empty")
	}

	now := time.Now().UTC()
	todo := &models.Todo{
		ID:          uuid.NewString(),
		UserID:      userID,
		Title:       title,
		Description: req.Description,
		IsCompleted: false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.todoRepo.Create(ctx, todo); err != nil {
		return nil, err
	}

	return todo, nil
}

func (s *todoService) GetByID(ctx context.Context, userID, id string) (*models.Todo, error) {
	todo, err := s.todoRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if todo == nil {
		return nil, ErrNotFound
	}
	if todo.UserID != userID {
		return nil, ErrUnauthorized
	}
	return todo, nil
}

func (s *todoService) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return s.todoRepo.GetByUserID(ctx, userID)
}

func (s *todoService) Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error) {
	todo, err := s.todoRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if todo == nil {
		return nil, ErrNotFound
	}
	if todo.UserID != userID {
		return nil, ErrUnauthorized
	}

	updated := false
	if req.Title != "" {
		todo.Title = strings.TrimSpace(req.Title)
		updated = true
	}
	if req.Description != "" || req.Title != "" {
		todo.Description = req.Description
		updated = true
	}
	if req.IsCompleted != nil {
		todo.IsCompleted = *req.IsCompleted
		updated = true
	}

	if updated {
		todo.UpdatedAt = time.Now().UTC()
		if err := s.todoRepo.Update(ctx, todo); err != nil {
			return nil, err
		}
	}

	return todo, nil
}

func (s *todoService) Delete(ctx context.Context, userID, id string) error {
	todo, err := s.todoRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if todo == nil {
		return ErrNotFound
	}
	if todo.UserID != userID {
		return ErrUnauthorized
	}
	return s.todoRepo.Delete(ctx, id)
}
