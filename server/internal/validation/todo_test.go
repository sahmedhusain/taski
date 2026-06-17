package validation

import (
	"testing"
)

func TestValidateTaskTitle(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		wantErr bool
	}{
		{"Valid title", "Buy milk", false},
		{"Empty title", "", true},
		{"Too long title", string(make([]byte, 256)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskTitle(tt.title)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskTitle() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskDescription(t *testing.T) {
	tests := []struct {
		name    string
		desc    string
		wantErr bool
	}{
		{"Valid description", "Buy organic whole milk.", false},
		{"Empty description", "", false},
		{"Too long description", string(make([]byte, 2001)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskDescription(tt.desc)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskDescription() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskListName(t *testing.T) {
	tests := []struct {
		name    string
		list    string
		wantErr bool
	}{
		{"Valid list", "Personal", false},
		{"Empty list", "", false},
		{"Too long list", string(make([]byte, 101)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskListName(tt.list)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskListName() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskSectionName(t *testing.T) {
	tests := []struct {
		name    string
		section string
		wantErr bool
	}{
		{"Valid section", "Home Errands", false},
		{"Empty section", "", false},
		{"Too long section", string(make([]byte, 101)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskSectionName(tt.section)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskSectionName() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskPriority(t *testing.T) {
	tests := []struct {
		name     string
		priority string
		wantErr  bool
	}{
		{"Valid None", "None", false},
		{"Valid Low", "Low", false},
		{"Valid Medium", "Medium", false},
		{"Valid High", "High", false},
		{"Valid Empty", "", false},
		{"Invalid priority", "Urgent", true},
		{"Invalid casing", "low", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskPriority(tt.priority)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskPriority() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskLocation(t *testing.T) {
	tests := []struct {
		name    string
		loc     string
		wantErr bool
	}{
		{"Valid location", "Local supermarket", false},
		{"Empty location", "", false},
		{"Too long location", string(make([]byte, 501)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskLocation(tt.loc)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskLocation() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskTags(t *testing.T) {
	tests := []struct {
		name    string
		tags    string
		wantErr bool
	}{
		{"Valid tags", "shopping,groceries", false},
		{"Empty tags", "", false},
		{"Too long tags", string(make([]byte, 501)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTaskTags(tt.tags)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTaskTags() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
