#!/bin/bash

# Vessel Tracker Docker Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="vessel-tracker"

# Function to print colored output
print_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

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

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check Docker and Docker Compose
check_docker() {
    print_status "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_success "Docker version: $DOCKER_VERSION"

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version --short)
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        COMPOSE_CMD="docker-compose"
    fi

    print_success "Docker Compose version: $COMPOSE_VERSION"
}

# Check compose file
check_compose_file() {
    print_status "Checking docker-compose.yml..."

    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "docker-compose.yml not found in current directory"
        exit 1
    fi

    # Validate compose file
    if $COMPOSE_CMD config &> /dev/null; then
        print_success "docker-compose.yml is valid"
    else
        print_error "docker-compose.yml has syntax errors"
        $COMPOSE_CMD config
        exit 1
    fi
}

# Check Dockerfiles
check_dockerfiles() {
    print_status "Checking Dockerfiles..."

    if [ ! -f "backend/Dockerfile" ]; then
        print_error "Backend Dockerfile not found"
        exit 1
    fi

    if [ ! -f "vessel-tracker-web/Dockerfile" ]; then
        print_error "Frontend Dockerfile not found"
        exit 1
    fi

    print_success "Dockerfiles found"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."

    # Backend environment
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            print_warning "No backend .env file found. Copying from .env.example"
            cp backend/.env.example backend/.env
            print_warning "Please edit backend/.env with your configuration"
        else
            print_warning "Creating basic backend .env file"
            cat > backend/.env << EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=vessel_tracker
DB_USER=vessel_user
DB_PASSWORD=vessel_password

# Server Configuration
PORT=4000
GIN_MODE=release

# External API Keys (configure as needed)
# EXTERNAL_API_KEY=your_api_key_here
EOF
        fi
    fi

    # Frontend environment
    if [ ! -f "vessel-tracker-web/.env.local" ]; then
        print_warning "Creating basic frontend .env.local file"
        cat > vessel-tracker-web/.env.local << EOF
# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Production settings
NODE_ENV=production
EOF
        print_warning "Please edit vessel-tracker-web/.env.local with your configuration"
    fi

    print_success "Environment files ready"
}

# Build images
build_images() {
    print_step "Building Docker images..."

    # Build all images
    $COMPOSE_CMD build

    if [ $? -eq 0 ]; then
        print_success "All images built successfully"
    else
        print_error "Image build failed"
        exit 1
    fi
}

# Start services
start_services() {
    print_step "Starting services..."

    # Start all services
    $COMPOSE_CMD up -d

    if [ $? -eq 0 ]; then
        print_success "All services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Check service health
check_health() {
    print_step "Checking service health..."

    # Wait a moment for services to start
    sleep 10

    # Check database
    if $COMPOSE_CMD exec -T postgres pg_isready -U vessel_user &> /dev/null; then
        print_success "✓ Database is healthy"
    else
        print_warning "⚠ Database might not be ready yet"
    fi

    # Check backend
    if curl -f http://localhost:4000 &> /dev/null || curl -f http://localhost:4000/health &> /dev/null; then
        print_success "✓ Backend is healthy"
    else
        print_warning "⚠ Backend might not be ready yet"
    fi

    # Check frontend
    if curl -f http://localhost:5000 &> /dev/null; then
        print_success "✓ Frontend is healthy"
    else
        print_warning "⚠ Frontend might not be ready yet"
    fi
}

# Show service status
show_status() {
    print_header "SERVICE STATUS"
    $COMPOSE_CMD ps
}

# Show logs
show_logs() {
    print_header "RECENT LOGS"
    $COMPOSE_CMD logs --tail=20
}

# Stop services
stop_services() {
    print_step "Stopping services..."
    $COMPOSE_CMD down
    print_success "Services stopped"
}

# Remove everything (including volumes)
cleanup_all() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        print_step "Removing all containers, networks, and volumes..."
        $COMPOSE_CMD down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Show deployment info
show_deployment_info() {
    print_header "DEPLOYMENT INFORMATION"
    echo ""
    echo "Services are running at:"
    echo "  🌐 Frontend:  http://localhost:5000"
    echo "  🚀 Backend:   http://localhost:4000"
    echo "  🗄️  Database: localhost:5432"
    echo ""
    echo "Useful commands:"
    echo "  📊 View status:    $COMPOSE_CMD ps"
    echo "  📝 View logs:      $COMPOSE_CMD logs -f [service_name]"
    echo "  🔄 Restart:        $COMPOSE_CMD restart [service_name]"
    echo "  🛑 Stop all:       $COMPOSE_CMD down"
    echo "  🔧 Shell access:   $COMPOSE_CMD exec [service_name] sh"
    echo ""
    echo "Service names: postgres, backend, frontend, nginx"
    echo ""
}

# Show menu
show_menu() {
    print_header "DOCKER DEPLOYMENT MENU"
    echo "1. Deploy (Build + Start)"
    echo "2. Start Services"
    echo "3. Stop Services"
    echo "4. Restart Services"
    echo "5. View Status"
    echo "6. View Logs"
    echo "7. Build Images Only"
    echo "8. Cleanup All"
    echo "9. Show Deployment Info"
    echo "10. Exit"
    echo ""
}

# Full deployment
deploy() {
    print_header "FULL DOCKER DEPLOYMENT"

    check_docker
    check_compose_file
    check_dockerfiles
    setup_environment
    build_images
    start_services
    check_health
    show_status
    show_deployment_info
}

# Main function
main() {
    case "${1:-menu}" in
        "deploy")
            deploy
            ;;
        "start")
            start_services
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            print_step "Restarting services..."
            $COMPOSE_CMD restart
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "build")
            build_images
            ;;
        "cleanup")
            cleanup_all
            ;;
        "info")
            show_deployment_info
            ;;
        "menu"|*)
            # Interactive menu
            while true; do
                echo ""
                show_menu
                read -p "Please select an option (1-10): " choice

                case $choice in
                    1) deploy ;;
                    2) start_services; show_status ;;
                    3) stop_services ;;
                    4) $COMPOSE_CMD restart; show_status ;;
                    5) show_status ;;
                    6) show_logs ;;
                    7) build_images ;;
                    8) cleanup_all ;;
                    9) show_deployment_info ;;
                    10) print_status "Exiting..."; exit 0 ;;
                    *) print_error "Invalid option. Please select 1-10." ;;
                esac

                echo ""
                read -p "Press Enter to continue..."
            done
            ;;
    esac
}

# Handle script interruption
trap 'print_warning "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"