package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"todo-server/internal/models"

	"golang.org/x/crypto/bcrypt"
)

type mockUserRepository struct {
	users       map[string]*models.User
	shouldFail  bool
	failMessage string
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[string]*models.User),
	}
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	if m.shouldFail {
		return errors.New(m.failMessage)
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New(m.failMessage)
	}
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New(m.failMessage)
	}
	u, exists := m.users[id]
	if !exists {
		return nil, nil
	}
	return u, nil
}

func (m *mockUserRepository) Update(ctx context.Context, user *models.User) error {
	if m.shouldFail {
		return errors.New(m.failMessage)
	}
	m.users[user.ID] = user
	return nil
}

func TestUserService_Register(t *testing.T) {
	repo := newMockUserRepository()
	svc := NewUserService(repo)
	ctx := context.Background()

	t.Run("Valid registration", func(t *testing.T) {
		req := &models.RegisterRequest{
			Email:    "test@domain.com",
			FullName: "John Doe",
			Password: "Password123!",
		}

		res, err := svc.Register(ctx, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res.Email != "test@domain.com" {
			t.Errorf("expected email to be test@domain.com, got %s", res.Email)
		}
		if res.FullName != "John Doe" {
			t.Errorf("expected fullName to be John Doe, got %s", res.FullName)
		}
		if res.ID == "" {
			t.Errorf("expected generated UUID, got empty")
		}

		// Verify password hash in repository
		savedUser := repo.users[res.ID]
		if savedUser == nil {
			t.Fatal("user not saved in repository")
		}
		err = bcrypt.CompareHashAndPassword([]byte(savedUser.PasswordHash), []byte(req.Password))
		if err != nil {
			t.Errorf("saved password hash does not match original password: %v", err)
		}
	})

	t.Run("Invalid email format", func(t *testing.T) {
		req := &models.RegisterRequest{
			Email:    "invalid-email",
			FullName: "John Doe",
			Password: "Password123!",
		}

		_, err := svc.Register(ctx, req)
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("Invalid password", func(t *testing.T) {
		req := &models.RegisterRequest{
			Email:    "valid@domain.com",
			FullName: "John Doe",
			Password: "short",
		}

		_, err := svc.Register(ctx, req)
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("Email already taken", func(t *testing.T) {
		// Save an existing user
		existing := &models.User{
			ID:    "existing-123",
			Email: "taken@domain.com",
		}
		repo.users[existing.ID] = existing

		req := &models.RegisterRequest{
			Email:    "TAKEN@domain.com", // testing case insensitivity
			FullName: "John Doe",
			Password: "Password123!",
		}

		_, err := svc.Register(ctx, req)
		if !errors.Is(err, ErrEmailTaken) {
			t.Errorf("expected ErrEmailTaken, got %v", err)
		}
	})
}

func TestUserService_Login(t *testing.T) {
	repo := newMockUserRepository()
	svc := NewUserService(repo)
	ctx := context.Background()
	secret := []byte("my-jwt-secret")

	// Create a test user with hashed password
	hashed, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), 12)
	testUser := &models.User{
		ID:           "user-uuid",
		Email:        "login@domain.com",
		FullName:     "Login User",
		PasswordHash: string(hashed),
		CreatedAt:    time.Now().UTC(),
	}
	repo.users[testUser.ID] = testUser

	t.Run("Successful login", func(t *testing.T) {
		req := &models.LoginRequest{
			Email:    "login@domain.com",
			Password: "Password123!",
		}

		token, res, err := svc.Login(ctx, req, secret)
		if err != nil {
			t.Fatalf("unexpected login error: %v", err)
		}

		if token == "" {
			t.Errorf("expected non-empty JWT token string")
		}
		if res.ID != testUser.ID {
			t.Errorf("expected user ID %s, got %s", testUser.ID, res.ID)
		}
	})

	t.Run("Invalid password", func(t *testing.T) {
		req := &models.LoginRequest{
			Email:    "login@domain.com",
			Password: "wrongpassword",
		}

		_, _, err := svc.Login(ctx, req, secret)
		if !errors.Is(err, ErrInvalidCredentials) {
			t.Errorf("expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("User not found", func(t *testing.T) {
		req := &models.LoginRequest{
			Email:    "notfound@domain.com",
			Password: "Password123!",
		}

		_, _, err := svc.Login(ctx, req, secret)
		if !errors.Is(err, ErrInvalidCredentials) {
			t.Errorf("expected ErrInvalidCredentials, got %v", err)
		}
	})
}

func TestUserService_GetUserByID(t *testing.T) {
	repo := newMockUserRepository()
	svc := NewUserService(repo)
	ctx := context.Background()

	testUser := &models.User{
		ID:       "user-uuid",
		Email:    "get@domain.com",
		FullName: "Get User",
	}
	repo.users[testUser.ID] = testUser

	t.Run("Success", func(t *testing.T) {
		res, err := svc.GetUserByID(ctx, "user-uuid")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Email != testUser.Email {
			t.Errorf("expected email %s, got %s", testUser.Email, res.Email)
		}
	})

	t.Run("Not Found", func(t *testing.T) {
		_, err := svc.GetUserByID(ctx, "non-existing")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("expected ErrNotFound, got %v", err)
		}
	})
}

func TestUserService_UpdateProfile(t *testing.T) {
	repo := newMockUserRepository()
	svc := NewUserService(repo)
	ctx := context.Background()

	hashed, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), 12)
	testUser := &models.User{
		ID:           "user-uuid",
		Email:        "update@domain.com",
		FullName:     "Original Name",
		PasswordHash: string(hashed),
	}
	repo.users[testUser.ID] = testUser

	t.Run("Update basic fields", func(t *testing.T) {
		req := &models.UpdateProfileRequest{
			FullName:    "Updated Name",
			CompanyName: "Acme Corp",
			Designation: "Software Engineer",
			Department:  "Engineering",
			DateOfBirth: "1990-01-01",
		}

		res, err := svc.UpdateProfile(ctx, "user-uuid", req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res.FullName != "Updated Name" {
			t.Errorf("expected FullName 'Updated Name', got %s", res.FullName)
		}
		if res.CompanyName != "Acme Corp" {
			t.Errorf("expected CompanyName 'Acme Corp', got %s", res.CompanyName)
		}
		if res.DateOfBirth != "1990-01-01" {
			t.Errorf("expected DateOfBirth '1990-01-01', got %s", res.DateOfBirth)
		}
	})

	t.Run("Change email successfully", func(t *testing.T) {
		req := &models.UpdateProfileRequest{
			FullName: "Updated Name",
			Email:    "new-email@domain.com",
			Password: "Password123!", // password confirmation
		}

		res, err := svc.UpdateProfile(ctx, "user-uuid", req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res.Email != "new-email@domain.com" {
			t.Errorf("expected Email 'new-email@domain.com', got %s", res.Email)
		}
	})

	t.Run("Change email - incorrect password confirmation", func(t *testing.T) {
		req := &models.UpdateProfileRequest{
			FullName: "Updated Name",
			Email:    "another-email@domain.com",
			Password: "wrongpassword",
		}

		_, err := svc.UpdateProfile(ctx, "user-uuid", req)
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("Change email - conflict", func(t *testing.T) {
		// Add another user that owns the conflicting email
		conflictUser := &models.User{
			ID:    "other-user",
			Email: "taken@domain.com",
		}
		repo.users[conflictUser.ID] = conflictUser

		req := &models.UpdateProfileRequest{
			FullName: "Updated Name",
			Email:    "taken@domain.com",
			Password: "Password123!",
		}

		_, err := svc.UpdateProfile(ctx, "user-uuid", req)
		if !errors.Is(err, ErrEmailTaken) {
			t.Errorf("expected ErrEmailTaken, got %v", err)
		}
	})
}
