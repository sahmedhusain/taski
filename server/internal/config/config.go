package config

import (
	"os"
	"strings"
)

type Config struct {
	Port               string
	Environment        string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	JWTSecret          []byte
	CORSAllowedOrigins []string
}

func LoadConfig() (*Config, error) {
	port := getEnv("PORT", "8080")
	env := getEnv("ENVIRONMENT", "development")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "todo")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")
	jwtSecret := getEnv("JWT_SECRET", "super_secure_enterprise_grade_jwt_secret_change_me_in_production")
	corsAllowed := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")

	origins := strings.Split(corsAllowed, ",")
	for i, o := range origins {
		origins[i] = strings.TrimSpace(o)
	}

	return &Config{
		Port:               port,
		Environment:        env,
		DBHost:             dbHost,
		DBPort:             dbPort,
		DBUser:             dbUser,
		DBPassword:         dbPassword,
		DBName:             dbName,
		DBSSLMode:          dbSSLMode,
		JWTSecret:          []byte(jwtSecret),
		CORSAllowedOrigins: origins,
	}, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
