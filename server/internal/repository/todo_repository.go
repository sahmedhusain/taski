package repository

import (
	"context"
	"database/sql"
	"errors"
	"todo-server/internal/models"
)

type TodoRepository interface {
	Create(ctx context.Context, todo *models.Todo) error
	GetByID(ctx context.Context, id string) (*models.Todo, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error)
	GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error)
	Update(ctx context.Context, todo *models.Todo) error
	Delete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	CleanupDeleted(ctx context.Context) error
}

type postgresTodoRepository struct {
	db *sql.DB
}

func NewTodoRepository(db *sql.DB) TodoRepository {
	return &postgresTodoRepository{db: db}
}

func (r *postgresTodoRepository) Create(ctx context.Context, todo *models.Todo) error {
	query := `INSERT INTO todos (
		id, user_id, title, description, is_completed, 
		url, due_date, due_time, is_urgent, list_name, 
		tags, is_flagged, priority, location, section_name, 
		deleted_at, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`
	
	_, err := r.db.ExecContext(ctx, query, 
		todo.ID, todo.UserID, todo.Title, todo.Description, todo.IsCompleted,
		todo.URL, todo.DueDate, todo.DueTime, todo.IsUrgent, todo.ListName,
		todo.Tags, todo.IsFlagged, todo.Priority, todo.Location, todo.SectionName,
		todo.DeletedAt, todo.CreatedAt, todo.UpdatedAt,
	)
	return err
}

func (r *postgresTodoRepository) GetByID(ctx context.Context, id string) (*models.Todo, error) {
	query := `SELECT 
		id, user_id, title, description, is_completed, 
		url, due_date, due_time, is_urgent, list_name, 
		tags, is_flagged, priority, location, section_name, 
		deleted_at, created_at, updated_at 
	FROM todos WHERE id = $1`
	
	row := r.db.QueryRowContext(ctx, query, id)

	var todo models.Todo
	err := row.Scan(
		&todo.ID, &todo.UserID, &todo.Title, &todo.Description, &todo.IsCompleted,
		&todo.URL, &todo.DueDate, &todo.DueTime, &todo.IsUrgent, &todo.ListName,
		&todo.Tags, &todo.IsFlagged, &todo.Priority, &todo.Location, &todo.SectionName,
		&todo.DeletedAt, &todo.CreatedAt, &todo.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &todo, nil
}

func (r *postgresTodoRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	query := `SELECT 
		id, user_id, title, description, is_completed, 
		url, due_date, due_time, is_urgent, list_name, 
		tags, is_flagged, priority, location, section_name, 
		deleted_at, created_at, updated_at 
	FROM todos WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []*models.Todo
	for rows.Next() {
		var todo models.Todo
		err := rows.Scan(
			&todo.ID, &todo.UserID, &todo.Title, &todo.Description, &todo.IsCompleted,
			&todo.URL, &todo.DueDate, &todo.DueTime, &todo.IsUrgent, &todo.ListName,
			&todo.Tags, &todo.IsFlagged, &todo.Priority, &todo.Location, &todo.SectionName,
			&todo.DeletedAt, &todo.CreatedAt, &todo.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		todos = append(todos, &todo)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return todos, nil
}

func (r *postgresTodoRepository) GetDeletedByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	query := `SELECT 
		id, user_id, title, description, is_completed, 
		url, due_date, due_time, is_urgent, list_name, 
		tags, is_flagged, priority, location, section_name, 
		deleted_at, created_at, updated_at 
	FROM todos WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []*models.Todo
	for rows.Next() {
		var todo models.Todo
		err := rows.Scan(
			&todo.ID, &todo.UserID, &todo.Title, &todo.Description, &todo.IsCompleted,
			&todo.URL, &todo.DueDate, &todo.DueTime, &todo.IsUrgent, &todo.ListName,
			&todo.Tags, &todo.IsFlagged, &todo.Priority, &todo.Location, &todo.SectionName,
			&todo.DeletedAt, &todo.CreatedAt, &todo.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		todos = append(todos, &todo)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return todos, nil
}

func (r *postgresTodoRepository) Update(ctx context.Context, todo *models.Todo) error {
	query := `UPDATE todos SET 
		title = $1, description = $2, is_completed = $3, 
		url = $4, due_date = $5, due_time = $6, is_urgent = $7, 
		list_name = $8, tags = $9, is_flagged = $10, priority = $11, 
		location = $12, section_name = $13, deleted_at = $14, updated_at = $15 
	WHERE id = $16`
	
	_, err := r.db.ExecContext(ctx, query, 
		todo.Title, todo.Description, todo.IsCompleted,
		todo.URL, todo.DueDate, todo.DueTime, todo.IsUrgent,
		todo.ListName, todo.Tags, todo.IsFlagged, todo.Priority,
		todo.Location, todo.SectionName, todo.DeletedAt, todo.UpdatedAt, todo.ID,
	)
	return err
}

func (r *postgresTodoRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE todos SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *postgresTodoRepository) HardDelete(ctx context.Context, id string) error {
	query := `DELETE FROM todos WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *postgresTodoRepository) Restore(ctx context.Context, id string) error {
	query := `UPDATE todos SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *postgresTodoRepository) CleanupDeleted(ctx context.Context) error {
	query := `DELETE FROM todos WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'`
	_, err := r.db.ExecContext(ctx, query)
	return err
}
