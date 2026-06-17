package validation

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	EmailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	// Password must contain at least 8 characters, one uppercase, one lowercase, one digit, and one special character
	PasswordRegex = regexp.MustCompile(`^[a-zA-Z0-9\W_]*(?:[a-z][a-zA-Z0-9\W_]*[A-Z]|[A-Z][a-zA-Z0-9\W_]*[a-z])(?:[a-zA-Z0-9\W_]*\d|\d[a-zA-Z0-9\W_]*)(?:[a-zA-Z0-9\W_]*[\W_]|[\W_][a-zA-Z0-9\W_]*)[a-zA-Z0-9\W_]*$`)
)

func ValidateEmail(email string) error {
	if !EmailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	specialChars := regexp.MustCompile(`[\W_]`)

	for _, char := range password {
		switch {
		case 'a' <= char && char <= 'z':
			hasLower = true
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case '0' <= char && char <= '9':
			hasDigit = true
		case specialChars.MatchString(string(char)):
			hasSpecial = true
		}
	}

	if !hasLower || !hasUpper || !hasDigit || !hasSpecial {
		return errors.New("password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character")
	}

	return nil
}

func ValidateFullName(fullName string) error {
	if fullName == "" {
		return nil // optional
	}
	if len(fullName) < 2 || len(fullName) > 100 {
		return errors.New("full name must be between 2 and 100 characters")
	}
	validName := regexp.MustCompile(`^[a-zA-Z\s'\-.]+$`)
	if !validName.MatchString(fullName) {
		return errors.New("full name can only contain letters, spaces, hyphens, periods, and apostrophes")
	}
	return nil
}

func ValidateDateOfBirth(dob string) error {
	if dob == "" {
		return nil // optional
	}
	dobRegex := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	if !dobRegex.MatchString(dob) {
		return errors.New("date of birth must be in YYYY-MM-DD format")
	}
	t, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return errors.New("invalid date of birth format")
	}
	today := time.Now().UTC()
	if t.After(today) {
		return errors.New("date of birth cannot be in the future")
	}

	years := today.Year() - t.Year()
	if today.Month() < t.Month() || (today.Month() == t.Month() && today.Day() < t.Day()) {
		years--
	}

	if years < 12 {
		return errors.New("you must be at least 12 years old")
	}
	if years > 120 {
		return errors.New("invalid date of birth (age cannot exceed 120 years)")
	}
	return nil
}

func ValidateProfileField(field string, fieldName string) error {
	if len(field) > 100 {
		return errors.New(fieldName + " must not exceed 100 characters")
	}
	validChars := regexp.MustCompile(`^[a-zA-Z0-9\s'\-.,&()]*$`)
	if field != "" && !validChars.MatchString(field) {
		return errors.New(fieldName + " contains invalid characters")
	}
	return nil
}

func ValidateUUID(id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return errors.New("invalid identifier format")
	}
	return nil
}

func ValidateURL(u string) error {
	if u == "" {
		return nil
	}
	if len(u) > 2048 {
		return errors.New("url must not exceed 2048 characters")
	}
	lower := strings.ToLower(u)
	if strings.Contains(lower, "javascript:") || strings.Contains(lower, "data:") || strings.Contains(lower, "vbscript:") {
		return errors.New("unsafe url scheme detected")
	}
	return nil
}

func ValidateTaskTitle(title string) error {
	if title == "" {
		return errors.New("title cannot be empty")
	}
	if len(title) > 255 {
		return errors.New("title must not exceed 255 characters")
	}
	return nil
}

func ValidateTaskDescription(desc string) error {
	if len(desc) > 2000 {
		return errors.New("description must not exceed 2000 characters")
	}
	return nil
}

func ValidateTaskListName(list string) error {
	if len(list) > 100 {
		return errors.New("list name must not exceed 100 characters")
	}
	return nil
}

func ValidateTaskSectionName(section string) error {
	if len(section) > 100 {
		return errors.New("section name must not exceed 100 characters")
	}
	return nil
}

func ValidateTaskPriority(priority string) error {
	if priority == "" {
		return nil
	}
	validPriorities := map[string]bool{
		"None":   true,
		"Low":    true,
		"Medium": true,
		"High":   true,
	}
	if !validPriorities[priority] {
		return errors.New("invalid task priority level")
	}
	return nil
}

func ValidateTaskLocation(loc string) error {
	if len(loc) > 500 {
		return errors.New("location must not exceed 500 characters")
	}
	return nil
}

func ValidateTaskTags(tags string) error {
	if len(tags) > 500 {
		return errors.New("tags must not exceed 500 characters")
	}
	return nil
}
