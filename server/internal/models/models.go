package models

import "time"

// Database entities
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	FullName     string    `json:"full_name"`
	CompanyName  string    `json:"company_name"`
	Designation  string    `json:"designation"`
	Department   string    `json:"department"`
	DateOfBirth  string    `json:"date_of_birth"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Todo struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	IsCompleted bool       `json:"is_completed"`
	URL         string     `json:"url"`
	DueDate     *time.Time `json:"due_date"`
	DueTime     string     `json:"due_time"`
	IsUrgent    bool       `json:"is_urgent"`
	ListName    string     `json:"list_name"`
	Tags        string     `json:"tags"`
	IsFlagged   bool       `json:"is_flagged"`
	Priority    string     `json:"priority"`
	Location    string     `json:"location"`
	SectionName string     `json:"section_name"`
	DeletedAt   *time.Time `json:"deleted_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// HTTP API Requests & Responses
type RegisterRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserResponse struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	FullName    string    `json:"full_name"`
	CompanyName string    `json:"company_name"`
	Designation string    `json:"designation"`
	Department  string    `json:"department"`
	DateOfBirth string    `json:"date_of_birth"`
	CreatedAt   time.Time `json:"created_at"`
}

type UpdateProfileRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FullName    string `json:"full_name"`
	CompanyName string `json:"company_name"`
	Designation string `json:"designation"`
	Department  string `json:"department"`
	DateOfBirth string `json:"date_of_birth"`
}

type CreateTodoRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	URL         string  `json:"url"`
	DueDate     *string `json:"due_date"`
	DueTime     string  `json:"due_time"`
	IsUrgent    bool    `json:"is_urgent"`
	ListName    string  `json:"list_name"`
	Tags        string  `json:"tags"`
	IsFlagged   bool    `json:"is_flagged"`
	Priority    string  `json:"priority"`
	Location    string  `json:"location"`
	SectionName string  `json:"section_name"`
}

type UpdateTodoRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	URL         string  `json:"url"`
	DueDate     *string `json:"due_date"`
	DueTime     string  `json:"due_time"`
	IsUrgent    *bool   `json:"is_urgent"`
	ListName    string  `json:"list_name"`
	Tags        string  `json:"tags"`
	IsFlagged   *bool   `json:"is_flagged"`
	Priority    string  `json:"priority"`
	Location    string  `json:"location"`
	SectionName *string `json:"section_name"`
	IsCompleted *bool   `json:"is_completed"`
	Restore     *bool   `json:"restore"`
}
