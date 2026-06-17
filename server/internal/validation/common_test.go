package validation

import (
	"testing"
)

func TestValidateUUID(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{"Valid UUID v4", "8b17b2b8-93dc-4c48-b4b7-d1d85be19602", false},
		{"Valid UUID v1", "248e3cf8-e96e-11ee-adc4-0242ac120002", false},
		{"Invalid format - too short", "8b17b2b8", true},
		{"Invalid characters", "8b17b2b8-93dc-4c48-b4b7-d1d85be1960g", true},
		{"Empty string", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUUID(tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUUID() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"Valid HTTP URL", "http://example.com", false},
		{"Valid HTTPS URL", "https://sub.domain.co.uk/path?query=123", false},
		{"Empty URL (allowed)", "", false},
		{"Too long URL", string(make([]byte, 2049)), true},
		{"Unsafe scheme javascript", "javascript:alert(1)", true},
		{"Unsafe scheme mixed case javascript", "JaVaScRiPt:alert(1)", true},
		{"Unsafe scheme data", "data:text/html,<script>alert(1)</script>", true},
		{"Unsafe scheme vbscript", "vbscript:msgbox", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateURL(tt.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateURL() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
