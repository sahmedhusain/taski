package validation

import (
	"errors"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var (
	EmailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	// Password must contain at least 8 characters, one uppercase, one lowercase, one digit, and one special character
	PasswordRegex = regexp.MustCompile(`^[a-zA-Z0-9\W_]*(?:[a-z][a-zA-Z0-9\W_]*[A-Z]|[A-Z][a-zA-Z0-9\W_]*[a-z])(?:[a-zA-Z0-9\W_]*\d|\d[a-zA-Z0-9\W_]*)(?:[a-zA-Z0-9\W_]*[\W_]|[\W_][a-zA-Z0-9\W_]*)[a-zA-Z0-9\W_]*$`)
)

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
