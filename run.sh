#!/bin/bash
set -e

echo "========================================================"
echo "Starting To-Do Application..."
echo "========================================================"

# 1. Check if docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

# 2. Check for local .env file
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

# 3. Boot database and services
echo "Booting Docker containers..."
docker compose up --build -d

# 4. Apply raw SQL migrations
echo "Applying raw SQL migrations to PostgreSQL..."
docker compose exec -T db psql -U postgres -d todo < database/migrations/000001_init.up.sql

echo "========================================================"
echo "System successfully initialized!"
echo "Database port (5432) is isolated inside the Docker bridge."
echo "Access the frontend dashboard at: http://localhost:3000"
echo "========================================================"