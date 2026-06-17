package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"todo-server/internal/models"
)

type mockTodoRepository struct {
	todos map[string]*models.Todo
}

func newMockTodoRepository() *mockTodoRepository {
	return &mockTodoRepository{
		todos: make(map[string]*models.Todo),
	}
}

func (m *mockTodoRepository) Create(ctx context.Context, todo *models.Todo) error {
	m.todos[todo.ID] = todo
	return nil
}

func (m *mockTodoRepository) GetByID(ctx context.Context, id string) (*models.Todo, error) {
	t, exists := m.todos[id]
	if !exists {
		return nil, nil
	}
	return t, nil
}

func (m *mockTodoRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	var results []*models.Todo
	for _, t := range m.todos {
		if t.UserID == userID && t.DeletedAt == nil {
			results = append(results, t)
		}
	}
	return results, nil
}

func (m *mockTodoRepository) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	var results []*models.Todo
	for _, t := range m.todos {
		if t.UserID == userID && t.DeletedAt != nil {
			results = append(results, t)
		}
	}
	return results, nil
}

func (m *mockTodoRepository) Update(ctx context.Context, todo *models.Todo) error {
	m.todos[todo.ID] = todo
	return nil
}

func (m *mockTodoRepository) Delete(ctx context.Context, id string) error {
	if t, exists := m.todos[id]; exists {
		now := time.Now().UTC()
		t.DeletedAt = &now
	}
	return nil
}

func (m *mockTodoRepository) HardDelete(ctx context.Context, id string) error {
	delete(m.todos, id)
	return nil
}

func (m *mockTodoRepository) Restore(ctx context.Context, id string) error {
	if t, exists := m.todos[id]; exists {
		t.DeletedAt = nil
	}
	return nil
}

func (m *mockTodoRepository) CleanupDeleted(ctx context.Context) error {
	for id, t := range m.todos {
		if t.DeletedAt != nil {
			delete(m.todos, id)
		}
	}
	return nil
}

func TestTodoService_Create(t *testing.T) {
	repo := newMockTodoRepository()
	svc := NewTodoService(repo)
	ctx := context.Background()
	userID := "8b17b2b8-93dc-4c48-b4b7-d1d85be19602"

	t.Run("Create valid todo", func(t *testing.T) {
		req := &models.CreateTodoRequest{
			Title:       "Task One",
			Description: "First task description",
			Priority:    "Medium",
			ListName:    "Work",
		}

		res, err := svc.Create(ctx, userID, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res.Title != "Task One" {
			t.Errorf("expected Title 'Task One', got %s", res.Title)
		}
		if res.UserID != userID {
			t.Errorf("expected UserID to match, got %s", res.UserID)
		}
		if res.Priority != "Medium" {
			t.Errorf("expected Priority 'Medium', got %s", res.Priority)
		}
	})

	t.Run("Empty title validation error", func(t *testing.T) {
		req := &models.CreateTodoRequest{
			Title: "",
		}
		_, err := svc.Create(ctx, userID, req)
		if err == nil {
			t.Errorf("expected validation error for empty title, got nil")
		}
	})

	t.Run("Due date in the past error", func(t *testing.T) {
		pastDateStr := "2020-01-01"
		req := &models.CreateTodoRequest{
			Title:   "Past task",
			DueDate: &pastDateStr,
		}
		_, err := svc.Create(ctx, userID, req)
		if err == nil {
			t.Errorf("expected error for past due date, got nil")
		}
	})
}

func TestTodoService_GetByID(t *testing.T) {
	repo := newMockTodoRepository()
	svc := NewTodoService(repo)
	ctx := context.Background()
	userID := "8b17b2b8-93dc-4c48-b4b7-d1d85be19602"
	todoID := "248e3cf8-e96e-11ee-adc4-0242ac120002"

	testTodo := &models.Todo{
		ID:     todoID,
		UserID: userID,
		Title:  "Existing Task",
	}
	repo.todos[todoID] = testTodo

	t.Run("Successful query", func(t *testing.T) {
		res, err := svc.GetByID(ctx, userID, todoID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Title != "Existing Task" {
			t.Errorf("expected Title 'Existing Task', got %s", res.Title)
		}
	})

	t.Run("Unauthorized access check", func(t *testing.T) {
		unauthorizedUUID := "482d8c36-e96e-11ee-adc4-0242ac120002"
		_, err := svc.GetByID(ctx, unauthorizedUUID, todoID)
		if !errors.Is(err, ErrUnauthorized) {
			t.Errorf("expected ErrUnauthorized, got %v", err)
		}
	})

	t.Run("Not Found", func(t *testing.T) {
		otherUUID := "482d8c36-e96e-11ee-adc4-0242ac120002"
		_, err := svc.GetByID(ctx, userID, otherUUID)
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("expected ErrNotFound, got %v", err)
		}
	})
}

func TestTodoService_Update(t *testing.T) {
	repo := newMockTodoRepository()
	svc := NewTodoService(repo)
	ctx := context.Background()
	userID := "8b17b2b8-93dc-4c48-b4b7-d1d85be19602"
	todoID := "248e3cf8-e96e-11ee-adc4-0242ac120002"

	testTodo := &models.Todo{
		ID:        todoID,
		UserID:    userID,
		Title:     "Old Title",
		ListName:  "Old List",
		IsUrgent:  false,
		Priority:  "Low",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.todos[todoID] = testTodo

	t.Run("Update fields successfully", func(t *testing.T) {
		isUrgentVal := true
		completedVal := true
		req := &models.UpdateTodoRequest{
			Title:       "New Title",
			ListName:    "New List",
			IsUrgent:    &isUrgentVal,
			IsCompleted: &completedVal,
		}

		res, err := svc.Update(ctx, userID, todoID, req)
		if err != nil {
			t.Fatalf("unexpected update error: %v", err)
		}

		if res.Title != "New Title" {
			t.Errorf("expected Title to update to 'New Title', got %s", res.Title)
		}
		if res.ListName != "New List" {
			t.Errorf("expected ListName to update to 'New List', got %s", res.ListName)
		}
		if res.IsUrgent != true {
			t.Errorf("expected IsUrgent to update to true")
		}
		if res.IsCompleted != true {
			t.Errorf("expected IsCompleted to update to true")
		}
	})
}
