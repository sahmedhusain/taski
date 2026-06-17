package validation

import (
	"errors"
)

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
