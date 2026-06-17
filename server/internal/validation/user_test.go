package validation

import (
	"testing"
)

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"Valid simple email", "user@example.com", false},
		{"Valid email with dot", "first.last@domain.co.uk", false},
		{"Invalid missing domain", "user@", true},
		{"Invalid missing username", "@domain.com", true},
		{"Invalid format", "user.domain.com", true},
		{"Empty email", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{"Valid secure password", "Password123!", false},
		{"Valid secure password with underscore", "u_R_safe1", false},
		{"Too short", "P123!", true},
		{"Missing digit", "Password!", true},
		{"Missing special char", "Password123", true},
		{"Missing upper case", "password123!", true},
		{"Missing lower case", "PASSWORD123!", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateFullName(t *testing.T) {
	tests := []struct {
		name     string
		fullName string
		wantErr  bool
	}{
		{"Valid name", "Sayed Ahmed", false},
		{"Valid name with hyphen", "John-Doe", false},
		{"Valid name with period", "J. R. Smith", false},
		{"Valid empty (optional)", "", false},
		{"Too short", "A", true},
		{"Invalid digits", "John123", true},
		{"Invalid symbols", "John@Doe", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFullName(tt.fullName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFullName() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateDateOfBirth(t *testing.T) {
	tests := []struct {
		name    string
		dob     string
		wantErr bool
	}{
		{"Valid adult dob", "1995-10-15", false},
		{"Valid child dob (12 years old)", "2014-01-01", false}, // Assumed relative to current local time (2026)
		{"Valid empty (optional)", "", false},
		{"Invalid format", "15-10-1995", true},
		{"Invalid date digits", "1995/10/15", true},
		{"Future date", "2030-05-12", true},
		{"Too young (under 12)", "2020-05-12", true},
		{"Too old (over 120)", "1890-01-01", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateDateOfBirth(tt.dob)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateDateOfBirth() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateProfileField(t *testing.T) {
	tests := []struct {
		name      string
		field     string
		fieldName string
		wantErr   bool
	}{
		{"Valid standard text", "FinTech Solutions", "company", false},
		{"Valid text with special allowed chars", "Test & Corp, LLC.", "company", false},
		{"Valid empty", "", "company", false},
		{"Invalid hash symbol", "Test #1", "company", true},
		{"Invalid underscore", "IT_Ops", "department", true},
		{"Too long", string(make([]byte, 101)), "company", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateProfileField(tt.field, tt.fieldName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateProfileField() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
