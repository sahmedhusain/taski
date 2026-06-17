package repository

import (
	"context"
	"database/sql"
	"errors"
	"todo-server/internal/models"
)

type postgresUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &postgresUserRepository{db: db}
}

func (r *postgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)`
	_, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.CreatedAt)
	return err
}

func (r *postgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1)`
	row := r.db.QueryRowContext(ctx, query, email)

	var user models.User
	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `SELECT id, email, password_hash, created_at FROM users WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)

	var user models.User
	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

type postgresTodoRepository struct {
	db *sql.DB
}

func NewTodoRepository(db *sql.DB) TodoRepository {
	return &postgresTodoRepository{db: db}
}

func (r *postgresTodoRepository) Create(ctx context.Context, todo *models.Todo) error {
	query := `INSERT INTO todos (id, user_id, title, description, is_completed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.db.ExecContext(ctx, query, todo.ID, todo.UserID, todo.Title, todo.Description, todo.IsCompleted, todo.CreatedAt, todo.UpdatedAt)
	return err
}

func (r *postgresTodoRepository) GetByID(ctx context.Context, id string) (*models.Todo, error) {
	query := `SELECT id, user_id, title, description, is_completed, created_at, updated_at FROM todos WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)

	var todo models.Todo
	err := row.Scan(&todo.ID, &todo.UserID, &todo.Title, &todo.Description, &todo.IsCompleted, &todo.CreatedAt, &todo.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &todo, nil
}

func (r *postgresTodoRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Todo, error) {
	query := `SELECT id, user_id, title, description, is_completed, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []*models.Todo
	for rows.Next() {
		var todo models.Todo
		err := rows.Scan(&todo.ID, &todo.UserID, &todo.Title, &todo.Description, &todo.IsCompleted, &todo.CreatedAt, &todo.UpdatedAt)
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
	query := `UPDATE todos SET title = $1, description = $2, is_completed = $3, updated_at = $4 WHERE id = $5`
	_, err := r.db.ExecContext(ctx, query, todo.Title, todo.Description, todo.IsCompleted, todo.UpdatedAt, todo.ID)
	return err
}

func (r *postgresTodoRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM todos WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
