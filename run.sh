#!/bin/bash
set -e

# Setup clean termination on Exit / Ctrl+C
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    local exit_code=$?
    if [ -n "$BACKEND_PID" ] || [ -n "$FRONTEND_PID" ]; then
        echo -e "\n\nStopping background servers..."
        if [ -n "$BACKEND_PID" ]; then
            echo "Killing Go Backend (PID: $BACKEND_PID)..."
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        if [ -n "$FRONTEND_PID" ]; then
            echo "Killing Vite Frontend (PID: $FRONTEND_PID)..."
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
    fi
    exit $exit_code
}
trap cleanup SIGINT SIGTERM EXIT

# Helper to read configuration values with default fallbacks
read_default() {
    local prompt_text=$1
    local default_value=$2
    local user_input
    read -p "$prompt_text [$default_value]: " user_input
    echo "${user_input:-$default_value}"
}

# Function to interactive build .env file
configure_env_manually() {
    echo ""
    echo "========================================================"
    echo "Custom Environment Configuration (.env)"
    echo "Press Enter to accept the default values."
    echo "========================================================"
    
    PORT=$(read_default "Server Port" "8080")
    ENVIRONMENT=$(read_default "Environment (development/production)" "development")
    DB_HOST=$(read_default "Database Host" "localhost")
    DB_PORT=$(read_default "Database Port (use 5435 if DB in Docker on host)" "5435")
    DB_USER=$(read_default "Database User" "postgres")
    DB_PASSWORD=$(read_default "Database Password" "postgres")
    DB_NAME=$(read_default "Database Name" "todo")
    DB_SSLMODE=$(read_default "Database SSL Mode" "disable")
    JWT_SECRET=$(read_default "JWT Secret Key" "super_secure_jwt_secret_change_me_in_production")
    CORS_ALLOWED_ORIGINS=$(read_default "CORS Allowed Origins" "http://localhost:3000,http://localhost:5173")

    cat <<EOF > .env
# Server runtime configurations
PORT=$PORT
ENVIRONMENT=$ENVIRONMENT

# Database configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SSLMODE=$DB_SSLMODE

# Security configurations
JWT_SECRET=$JWT_SECRET
CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS
EOF
    echo "--------------------------------------------------------"
    echo "Custom .env file generated successfully!"
    echo "========================================================"
}

# 1. Check and Configure Environment Variables
if [ -f .env ]; then
    echo "Existing .env file detected."
    echo "1) Keep current .env"
    echo "2) Manually re-configure step-by-step"
    echo "3) Overwrite with default .env.example"
    read -p "Select option [1-3] (default: 1): " env_choice
    env_choice=${env_choice:-1}
    case "$env_choice" in
        2)
            configure_env_manually
            ;;
        3)
            echo "Copying .env.example to .env..."
            cp .env.example .env
            ;;
        *)
            echo "Keeping existing .env configuration."
            ;;
    esac
else
    echo "No .env file found."
    echo "1) Copy .env.example directly"
    echo "2) Manually configure step-by-step"
    read -p "Select option [1-2] (default: 1): " env_choice
    env_choice=${env_choice:-1}
    case "$env_choice" in
        2)
            configure_env_manually
            ;;
        *)
            echo "Copying .env.example to .env..."
            cp .env.example .env
            ;;
    esac
fi

# Load current configuration variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Helper function to check if db container is running and apply migrations
apply_migrations() {
    # 1. First check if Docker compose db container is active
    if [ "$(docker compose ps -q db 2>/dev/null)" ]; then
        echo "Waiting for Docker database container to be healthy..."
        until docker compose exec -T db pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; do
            echo "Database is not ready yet, sleeping 2s..."
            sleep 2
        done
        echo "Applying raw SQL migrations to Docker database..."
        docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < database/migrations/000001_init.up.sql
        echo "Migrations applied successfully."
    # 2. Otherwise, check if we can connect to a local PostgreSQL using local psql
    elif command -v psql >/dev/null 2>&1; then
        echo "Checking local PostgreSQL connection at $DB_HOST:$DB_PORT..."
        if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' >/dev/null 2>&1; then
            echo "Applying raw SQL migrations to local PostgreSQL ($DB_HOST:$DB_PORT)..."
            PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < database/migrations/000001_init.up.sql
            echo "Migrations applied successfully."
        else
            echo "Warning: Could not connect to local PostgreSQL database at $DB_HOST:$DB_PORT."
            echo "Please ensure the database exists and password/connection details are correct."
        fi
    else
        echo "Warning: No running Docker db container detected, and 'psql' client is not installed."
        echo "Skipping migrations. Make sure you apply database/migrations/000001_init.up.sql manually."
    fi
}

# Helper function to detect and resolve port conflicts on the host
check_port_clash() {
    local port=$1
    local name=$2
    if command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            for pid in $(lsof -iTCP:$port -sTCP:LISTEN -t); do
                local cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
                # Ignore Docker itself to avoid false positives when docker compose is already running
                if [[ "$cmd" =~ [Dd]ocker || "$cmd" =~ "vpnkit" ]]; then
                    continue
                fi
                echo "--------------------------------------------------------"
                echo "WARNING: Port $port ($name) is in use by a host process:"
                echo "         Process: $cmd (PID: $pid)"
                echo "--------------------------------------------------------"
                read -p "Do you want to stop/kill this process to free port $port? [y/N]: " kill_choice
                if [[ "$kill_choice" =~ ^[Yy]$ ]]; then
                    echo "Killing process $pid..."
                    kill -9 "$pid" || true
                    sleep 1
                else
                    echo "Error: Port $port is required by $name. Please free it manually and try again."
                    exit 1
                fi
            done
        fi
    fi
}

# Prerequisite checker for Normal Mode
check_normal_prerequisites() {
    echo "Checking local prerequisites for Normal Mode..."
    local missing=0

    if ! command -v go >/dev/null 2>&1; then
        echo "[-] Go is not installed or not in PATH."
        missing=1
    else
        echo "[✓] Go is available: $(go version | head -n 1)"
    fi

    if ! command -v node >/dev/null 2>&1; then
        echo "[-] Node.js is not installed or not in PATH."
        missing=1
    else
        echo "[✓] Node.js is available: $(node -v)"
    fi

    if ! command -v npm >/dev/null 2>&1; then
        echo "[-] NPM is not installed or not in PATH."
        missing=1
    else
        echo "[✓] NPM is available: $(npm -v)"
    fi

    if [ "$missing" -eq 1 ]; then
        echo "Error: Missing prerequisites. Please install Go and Node.js before running in Normal Mode."
        exit 1
    fi
}

# 2. Select execution mode
echo ""
echo "Choose execution mode:"
echo "1) Docker Mode (run everything inside Docker containers)"
echo "2) Normal Mode (run backend/frontend locally, optional DB/pgAdmin in Docker)"
read -p "Select mode [1-2] (default: 1): " mode_choice
mode_choice=${mode_choice:-1}

if [ "$mode_choice" -eq 1 ]; then
    echo "=============================================="
    echo "Starting in Docker Mode..."
    echo "=============================================="
    
    # Verify Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        echo "Error: Docker daemon is not running. Please start Docker."
        exit 1
    fi

    echo "1) Start all services (db, pgadmin, backend, frontend)"
    echo "2) Start specific services"
    read -p "Choose option [1-2] (default: 1): " svc_choice
    svc_choice=${svc_choice:-1}

    if [ "$svc_choice" -eq 2 ]; then
        echo "Select services to start (enter space-separated numbers, e.g., 1 3):"
        echo "1) db"
        echo "2) pgadmin"
        echo "3) backend"
        echo "4) frontend"
        read -p "Services: " selected_numbers
        
        # Check for port clashes on selected host ports
        for num in $selected_numbers; do
            case "$num" in
                1) check_port_clash 5435 "PostgreSQL Database" ;;
                2) check_port_clash 8085 "pgAdmin Dashboard" ;;
                4) check_port_clash 3000 "Nginx Frontend" ;;
            esac
        done

        SERVICES=""
        for num in $selected_numbers; do
            case "$num" in
                1) SERVICES="$SERVICES db" ;;
                2) SERVICES="$SERVICES pgadmin" ;;
                3) SERVICES="$SERVICES backend" ;;
                4) SERVICES="$SERVICES frontend" ;;
            esac
        done
        
        if [ -z "$SERVICES" ]; then
            echo "No valid services selected. Exiting."
            exit 1
        fi
        
        echo "Booting Docker containers: $SERVICES..."
        docker compose up --build -d $SERVICES
    else
        check_port_clash 5435 "PostgreSQL Database"
        check_port_clash 8085 "pgAdmin Dashboard"
        check_port_clash 3000 "Nginx Frontend"
        echo "Booting all Docker containers..."
        docker compose up --build -d
    fi

    # Apply database migrations if database container is active
    apply_migrations

    echo "========================================================"
    echo "Docker services successfully initialized!"
    echo "Access the frontend dashboard at: http://localhost:3000"
    echo "========================================================"

else
    echo "=============================================="
    echo "Starting in Normal Mode..."
    echo "=============================================="
    
    # Check dependencies on local machine
    check_normal_prerequisites

    echo "Select components to run locally on your host:"
    echo "Enter space-separated numbers (e.g., 1 2 3) to select multiple."
    echo "1) Go Backend (runs on localhost:8080)"
    echo "2) Vite Frontend (runs on localhost:3000)"
    echo "3) PostgreSQL Database (via Docker container, maps port 5435 on host)"
    echo "4) pgAdmin Dashboard (via Docker container, maps port 8085 on host)"
    read -p "Select choice [default: 1 2 3]: " components_choice
    components_choice=${components_choice:-"1 2 3"}

    start_local_backend=0
    start_local_frontend=0
    start_docker_db=0
    start_docker_pgadmin=0

    for choice in $components_choice; do
        case "$choice" in
            1) start_local_backend=1 ;;
            2) start_local_frontend=1 ;;
            3) start_docker_db=1 ;;
            4) start_docker_pgadmin=1 ;;
        esac
    done

    # Check for port clashes on selected host components
    if [ "$start_local_backend" -eq 1 ]; then
        check_port_clash "${PORT:-8080}" "Go Backend"
    fi
    if [ "$start_local_frontend" -eq 1 ]; then
        check_port_clash 3000 "Vite Frontend"
    fi
    if [ "$start_docker_db" -eq 1 ]; then
        check_port_clash 5435 "PostgreSQL Database"
    fi
    if [ "$start_docker_pgadmin" -eq 1 ]; then
        check_port_clash 8085 "pgAdmin Dashboard"
    fi

    # Verify Docker is running if Docker-based components were chosen
    if [ "$start_docker_db" -eq 1 ] || [ "$start_docker_pgadmin" -eq 1 ]; then
        if ! docker info >/dev/null 2>&1; then
            echo "Error: Docker daemon is not running but you selected Docker-based components. Please start Docker."
            exit 1
        fi
    fi

    # Boot Docker-based services
    if [ "$start_docker_db" -eq 1 ]; then
        echo "Starting PostgreSQL database container..."
        docker compose up -d db
    fi

    if [ "$start_docker_pgadmin" -eq 1 ]; then
        echo "Starting pgAdmin dashboard container..."
        docker compose up -d pgadmin
    fi

    # Apply database migrations if DB container or local DB is available
    apply_migrations

    # Boot Go Backend locally
    if [ "$start_local_backend" -eq 1 ]; then
        echo "Starting Go Backend..."
        cd server
        go run cmd/main.go > ../server.log 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        # Give Go server 1.5 seconds to bind to port and test if it's still running
        sleep 1.5
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo "[✓] Go Backend started successfully (PID: $BACKEND_PID, logs: server.log)"
        else
            echo "[X] Go Backend failed to start. Printing server.log tail:"
            tail -n 20 server.log
            exit 1
        fi
    fi

    # Boot Vite Frontend locally
    if [ "$start_local_frontend" -eq 1 ]; then
        if [ ! -d "apps/taski/node_modules" ]; then
            echo "node_modules not found for frontend. Installing dependencies..."
            cd apps/taski
            npm install
            cd ../..
        fi
        
        echo "Starting Vite Frontend..."
        cd apps/taski
        npm run dev > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ../..
        
        # Give Vite dev server 1.5 seconds to boot and check if it's still running
        sleep 1.5
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo "[✓] Vite Frontend started successfully (PID: $FRONTEND_PID, logs: frontend.log)"
        else
            echo "[X] Vite Frontend failed to start. Printing frontend.log tail:"
            tail -n 20 frontend.log
            exit 1
        fi
    fi

    echo ""
    echo "========================================================"
    echo "TaskI application is running in Normal Mode!"
    if [ "$start_local_backend" -eq 1 ]; then
        echo "- Go Backend API: http://localhost:$PORT"
    fi
    if [ "$start_local_frontend" -eq 1 ]; then
        echo "- Vite Frontend: http://localhost:3000"
    fi
    if [ "$start_docker_pgadmin" -eq 1 ]; then
        echo "- pgAdmin Dashboard: http://localhost:8085"
    fi
    echo "Logs are available in: server.log, frontend.log"
    echo "Press Ctrl+C to stop all local processes."
    echo "========================================================"

    # Wait indefinitely for background processes
    wait
fi