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
	GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error)
	Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error)
	Delete(ctx context.Context, userID, id string) error
	HardDelete(ctx context.Context, userID, id string) error
	Restore(ctx context.Context, userID, id string) error
	CleanupDeleted(ctx context.Context) error
}

type todoService struct {
	todoRepo repository.TodoRepository
}

func NewTodoService(todoRepo repository.TodoRepository) TodoService {
	return &todoService{todoRepo: todoRepo}
}

func parseDueDate(dateStr *string) *time.Time {
	if dateStr == nil || *dateStr == "" {
		return nil
	}
	// Try RFC3339 first
	parsed, err := time.Parse(time.RFC3339, *dateStr)
	if err == nil {
		return &parsed
	}
	// Try simple date layout
	parsed, err = time.Parse("2006-01-02", *dateStr)
	if err == nil {
		return &parsed
	}
	return nil
}

func (s *todoService) Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.New("title cannot be empty")
	}

	listName := strings.TrimSpace(req.ListName)
	if listName == "" {
		listName = "Todos"
	}

	priority := strings.TrimSpace(req.Priority)
	if priority == "" {
		priority = "None"
	}

	now := time.Now().UTC()
	todo := &models.Todo{
		ID:          uuid.NewString(),
		UserID:      userID,
		Title:       title,
		Description: req.Description,
		IsCompleted: false,
		URL:         req.URL,
		DueDate:     parseDueDate(req.DueDate),
		DueTime:     req.DueTime,
		IsUrgent:    req.IsUrgent,
		ListName:    listName,
		Tags:        req.Tags,
		IsFlagged:   req.IsFlagged,
		Priority:    priority,
		Location:    req.Location,
		SectionName: req.SectionName,
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

func (s *todoService) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	return s.todoRepo.GetDeletedByUserID(ctx, userID)
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
	if req.URL != "" {
		todo.URL = req.URL
		updated = true
	}
	if req.DueDate != nil {
		todo.DueDate = parseDueDate(req.DueDate)
		updated = true
	}
	if req.DueTime != "" {
		todo.DueTime = req.DueTime
		updated = true
	}
	if req.IsUrgent != nil {
		todo.IsUrgent = *req.IsUrgent
		updated = true
	}
	if req.ListName != "" {
		todo.ListName = strings.TrimSpace(req.ListName)
		updated = true
	}
	if req.Tags != "" {
		todo.Tags = req.Tags
		updated = true
	}
	if req.IsFlagged != nil {
		todo.IsFlagged = *req.IsFlagged
		updated = true
	}
	if req.Priority != "" {
		todo.Priority = req.Priority
		updated = true
	}
	if req.Location != "" {
		todo.Location = req.Location
		updated = true
	}
	if req.SectionName != "" {
		todo.SectionName = req.SectionName
		updated = true
	}

	// Restore soft deleted todo
	if req.Restore != nil && *req.Restore {
		todo.DeletedAt = nil
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

func (s *todoService) HardDelete(ctx context.Context, userID, id string) error {
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
	return s.todoRepo.HardDelete(ctx, id)
}

func (s *todoService) Restore(ctx context.Context, userID, id string) error {
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
	return s.todoRepo.Restore(ctx, id)
}

func (s *todoService) CleanupDeleted(ctx context.Context) error {
	return s.todoRepo.CleanupDeleted(ctx)
}
