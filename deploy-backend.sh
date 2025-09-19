#!/bin/bash

# Vessel Tracker Backend Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
BINARY_NAME="vessel-tracker"
BUILD_FLAGS="-ldflags='-s -w'"
GO_VERSION="1.21"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Go is installed and version
check_go() {
    print_status "Checking Go installation..."
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go $GO_VERSION or later."
        exit 1
    fi

    GO_CURRENT_VERSION=$(go version | cut -d' ' -f3 | sed 's/go//')
    print_success "Go version: $GO_CURRENT_VERSION"
}

# Change to backend directory
cd_backend() {
    print_status "Changing to backend directory..."
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    cd "$BACKEND_DIR"
    print_success "Changed to backend directory"
}

# Check environment file
check_env() {
    print_status "Checking environment configuration..."
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning "No .env file found. Please copy .env.example to .env and configure it."
            print_status "Creating .env from .env.example..."
            cp .env.example .env
            # Update PORT to 4000 in the copied .env file
            if grep -q "PORT=" .env; then
                sed -i.bak 's/PORT=.*/PORT=4000/' .env && rm .env.bak
            else
                echo "PORT=4000" >> .env
            fi
            print_warning "Please edit .env file with your configuration before deploying."
        else
            print_error "No .env or .env.example file found."
            exit 1
        fi
    else
        print_success "Environment file found"
    fi
}

# Download dependencies
download_deps() {
    print_status "Downloading Go dependencies..."
    go mod download
    go mod verify
    print_success "Dependencies downloaded and verified"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    if go test ./...; then
        print_success "All tests passed"
    else
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
}

# Build the application
build_app() {
    print_status "Building application..."

    # Clean previous build
    if [ -f "$BINARY_NAME" ]; then
        rm "$BINARY_NAME"
        print_status "Removed previous binary"
    fi

    # Build with optimizations
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build $BUILD_FLAGS -o "$BINARY_NAME" .

    if [ -f "$BINARY_NAME" ]; then
        print_success "Application built successfully: $BINARY_NAME"

        # Make executable
        chmod +x "$BINARY_NAME"

        # Show binary info
        ls -lh "$BINARY_NAME"
    else
        print_error "Build failed - binary not found"
        exit 1
    fi
}

# Check database connectivity (optional)
check_database() {
    print_status "Checking database connectivity..."
    # This would require the database to be running
    # For now, we'll just validate the .env has database config
    if grep -q "DB_HOST" .env && grep -q "DB_NAME" .env; then
        print_success "Database configuration found in .env"
    else
        print_warning "Database configuration may be incomplete in .env"
    fi
}

# Start the application (for testing)
start_app() {
    print_status "Starting application for testing..."
    if [ -f "$BINARY_NAME" ]; then
        print_status "Application will start on port 4000 (check .env for PORT setting)"
        print_status "To start: ./$BINARY_NAME"
        print_status "To start in background: nohup ./$BINARY_NAME > app.log 2>&1 &"
        print_status "API will be available at: http://localhost:4000"
    else
        print_error "Binary not found. Build failed."
        exit 1
    fi
}

# Create systemd service file (optional)
create_systemd_service() {
    print_status "Creating systemd service file..."

    CURRENT_DIR=$(pwd)
    USER=$(whoami)

    cat > vessel-tracker.service << EOF
[Unit]
Description=Vessel Tracker Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/$BINARY_NAME
Restart=always
RestartSec=10
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
EOF

    print_success "Systemd service file created: vessel-tracker.service"
    print_status "To install: sudo cp vessel-tracker.service /etc/systemd/system/"
    print_status "To enable: sudo systemctl enable vessel-tracker"
    print_status "To start: sudo systemctl start vessel-tracker"
}

# Main deployment function
main() {
    print_status "Starting Vessel Tracker Backend Deployment"
    print_status "==========================================="

    # Store original directory
    ORIGINAL_DIR=$(pwd)

    # Run deployment steps
    check_go
    cd_backend
    check_env
    download_deps

    # Ask if user wants to run tests
    read -p "Run tests before deployment? (y/N): " run_tests_choice
    if [[ $run_tests_choice =~ ^[Yy]$ ]]; then
        run_tests
    fi

    build_app
    check_database

    # Ask if user wants to create systemd service
    read -p "Create systemd service file? (y/N): " create_service_choice
    if [[ $create_service_choice =~ ^[Yy]$ ]]; then
        create_systemd_service
    fi

    start_app

    print_success "Backend deployment completed successfully!"
    print_status "Binary location: $(pwd)/$BINARY_NAME"

    # Return to original directory
    cd "$ORIGINAL_DIR"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"