package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"todo-server/internal/models"
	"todo-server/internal/repository"
	"todo-server/internal/validation"

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

func validateDueDateTime(dueDate *time.Time, dueTime string) error {
	if dueDate == nil {
		return nil
	}
	now := time.Now().UTC()
	if dueTime != "" {
		var hour, min int
		_, err := fmt.Sscanf(dueTime, "%d:%d", &hour, &min)
		if err == nil {
			fullDueDate := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), hour, min, 0, 0, time.UTC)
			if fullDueDate.Before(now) {
				return errors.New("due date and time cannot be in the past")
			}
		}
	} else {
		endOfDay := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 23, 59, 59, 999999999, time.UTC)
		if endOfDay.Before(now) {
			return errors.New("due date cannot be in the past")
		}
	}
	return nil
}

func (s *todoService) Create(ctx context.Context, userID string, req *models.CreateTodoRequest) (*models.Todo, error) {
	if err := validation.ValidateUUID(userID); err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	title := strings.TrimSpace(req.Title)
	if err := validation.ValidateTaskTitle(title); err != nil {
		return nil, err
	}

	if err := validation.ValidateTaskDescription(req.Description); err != nil {
		return nil, err
	}

	if err := validation.ValidateURL(req.URL); err != nil {
		return nil, err
	}

	listName := strings.TrimSpace(req.ListName)
	if err := validation.ValidateTaskListName(listName); err != nil {
		return nil, err
	}
	if listName == "" {
		listName = "Todos"
	}

	priority := strings.TrimSpace(req.Priority)
	if err := validation.ValidateTaskPriority(priority); err != nil {
		return nil, err
	}
	if priority == "" {
		priority = "None"
	}

	if err := validation.ValidateTaskLocation(req.Location); err != nil {
		return nil, err
	}

	if err := validation.ValidateTaskTags(req.Tags); err != nil {
		return nil, err
	}

	if err := validation.ValidateTaskSectionName(req.SectionName); err != nil {
		return nil, err
	}

	dueDate := parseDueDate(req.DueDate)
	if err := validateDueDateTime(dueDate, req.DueTime); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	todo := &models.Todo{
		ID:          uuid.NewString(),
		UserID:      userID,
		Title:       title,
		Description: req.Description,
		IsCompleted: false,
		URL:         req.URL,
		DueDate:     dueDate,
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
	if err := validation.ValidateUUID(id); err != nil {
		return nil, fmt.Errorf("%w: invalid todo id: %v", ErrInvalidInput, err)
	}
	if err := validation.ValidateUUID(userID); err != nil {
		return nil, fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}

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
	if err := validation.ValidateUUID(userID); err != nil {
		return nil, fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}
	return s.todoRepo.GetByUserID(ctx, userID)
}

func (s *todoService) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	if err := validation.ValidateUUID(userID); err != nil {
		return nil, fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}
	return s.todoRepo.GetDeletedByUserID(ctx, userID)
}

func (s *todoService) Update(ctx context.Context, userID, id string, req *models.UpdateTodoRequest) (*models.Todo, error) {
	if err := validation.ValidateUUID(id); err != nil {
		return nil, fmt.Errorf("%w: invalid todo id: %v", ErrInvalidInput, err)
	}
	if err := validation.ValidateUUID(userID); err != nil {
		return nil, fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}

	// Validate inputs first (SEC-03, SEC-05)
	if req.Title != "" {
		if err := validation.ValidateTaskTitle(strings.TrimSpace(req.Title)); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.Description != "" {
		if err := validation.ValidateTaskDescription(req.Description); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.URL != "" {
		if err := validation.ValidateURL(req.URL); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.ListName != "" {
		if err := validation.ValidateTaskListName(strings.TrimSpace(req.ListName)); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.Priority != "" {
		if err := validation.ValidateTaskPriority(strings.TrimSpace(req.Priority)); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.Location != "" {
		if err := validation.ValidateTaskLocation(req.Location); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.Tags != "" {
		if err := validation.ValidateTaskTags(req.Tags); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}
	if req.SectionName != nil {
		if err := validation.ValidateTaskSectionName(*req.SectionName); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
	}

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

	newDueDate := todo.DueDate
	newDueTime := todo.DueTime
	dateOrTimeChanged := false

	if req.DueDate != nil {
		newDueDate = parseDueDate(req.DueDate)
		dateOrTimeChanged = true
	}
	if req.DueTime != "" {
		newDueTime = req.DueTime
		dateOrTimeChanged = true
	}

	if dateOrTimeChanged {
		isDifferent := false
		if (newDueDate == nil) != (todo.DueDate == nil) {
			isDifferent = true
		} else if newDueDate != nil && todo.DueDate != nil && !newDueDate.Equal(*todo.DueDate) {
			isDifferent = true
		}
		if newDueTime != todo.DueTime {
			isDifferent = true
		}

		if isDifferent && newDueDate != nil {
			if err := validateDueDateTime(newDueDate, newDueTime); err != nil {
				return nil, err
			}
		}
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
		todo.DueDate = newDueDate
		updated = true
	}
	if req.DueTime != "" {
		todo.DueTime = newDueTime
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
	if req.SectionName != nil {
		todo.SectionName = strings.TrimSpace(*req.SectionName)
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
	if err := validation.ValidateUUID(id); err != nil {
		return fmt.Errorf("%w: invalid todo id: %v", ErrInvalidInput, err)
	}
	if err := validation.ValidateUUID(userID); err != nil {
		return fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}

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
	if err := validation.ValidateUUID(id); err != nil {
		return fmt.Errorf("%w: invalid todo id: %v", ErrInvalidInput, err)
	}
	if err := validation.ValidateUUID(userID); err != nil {
		return fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}

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
	if err := validation.ValidateUUID(id); err != nil {
		return fmt.Errorf("%w: invalid todo id: %v", ErrInvalidInput, err)
	}
	if err := validation.ValidateUUID(userID); err != nil {
		return fmt.Errorf("%w: invalid user id: %v", ErrInvalidInput, err)
	}

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
