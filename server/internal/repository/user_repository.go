package repository

import (
	"context"
	"database/sql"
	"errors"
	"todo-server/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
}

type postgresUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &postgresUserRepository{db: db}
}

func (r *postgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `INSERT INTO users (id, email, full_name, company_name, designation, department, date_of_birth, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.FullName, user.CompanyName, user.Designation, user.Department, user.DateOfBirth, user.PasswordHash, user.CreatedAt)
	return err
}

func (r *postgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, full_name, company_name, designation, department, date_of_birth, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1)`
	row := r.db.QueryRowContext(ctx, query, email)

	var user models.User
	err := row.Scan(&user.ID, &user.Email, &user.FullName, &user.CompanyName, &user.Designation, &user.Department, &user.DateOfBirth, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `SELECT id, email, full_name, company_name, designation, department, date_of_birth, password_hash, created_at FROM users WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)

	var user models.User
	err := row.Scan(&user.ID, &user.Email, &user.FullName, &user.CompanyName, &user.Designation, &user.Department, &user.DateOfBirth, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresUserRepository) Update(ctx context.Context, user *models.User) error {
	query := `UPDATE users SET email = $1, full_name = $2, company_name = $3, designation = $4, department = $5, date_of_birth = $6 WHERE id = $7`
	_, err := r.db.ExecContext(ctx, query, user.Email, user.FullName, user.CompanyName, user.Designation, user.Department, user.DateOfBirth, user.ID)
	return err
}
