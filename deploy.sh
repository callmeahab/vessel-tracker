#!/bin/bash

# Vessel Tracker Full Application Deployment Script
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_SCRIPT="$SCRIPT_DIR/deploy-backend.sh"
FRONTEND_SCRIPT="$SCRIPT_DIR/deploy-frontend.sh"

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

# Check if deployment scripts exist
check_scripts() {
    print_status "Checking deployment scripts..."

    if [ ! -f "$BACKEND_SCRIPT" ]; then
        print_error "Backend deployment script not found: $BACKEND_SCRIPT"
        exit 1
    fi

    if [ ! -f "$FRONTEND_SCRIPT" ]; then
        print_error "Frontend deployment script not found: $FRONTEND_SCRIPT"
        exit 1
    fi

    # Make scripts executable
    chmod +x "$BACKEND_SCRIPT" "$FRONTEND_SCRIPT"

    print_success "Deployment scripts found and are executable"
}

# Show deployment options
show_options() {
    print_header "VESSEL TRACKER DEPLOYMENT OPTIONS"
    echo "1. Deploy Backend Only"
    echo "2. Deploy Frontend Only"
    echo "3. Deploy Both (Full Deployment)"
    echo "4. Show System Requirements"
    echo "5. Exit"
    echo ""
}

# Show system requirements
show_requirements() {
    print_header "SYSTEM REQUIREMENTS"
    echo ""
    echo "Backend Requirements:"
    echo "  - Go 1.21 or later"
    echo "  - PostgreSQL database"
    echo "  - Environment file (.env) configured"
    echo ""
    echo "Frontend Requirements:"
    echo "  - Node.js 18 or later"
    echo "  - npm package manager"
    echo "  - Mapbox access token"
    echo ""
    echo "Optional:"
    echo "  - PM2 for process management (npm install -g pm2)"
    echo "  - Nginx for reverse proxy"
    echo "  - systemd for service management"
    echo ""
}

# Pre-deployment checks
pre_deployment_checks() {
    print_step "Running pre-deployment checks..."

    # Check if we're in the right directory
    if [ ! -f "backend/go.mod" ] || [ ! -f "vessel-tracker-web/package.json" ]; then
        print_error "This doesn't appear to be the vessel-tracker project root directory."
        print_error "Please run this script from the project root."
        exit 1
    fi

    # Check Git status
    if command -v git &> /dev/null && [ -d ".git" ]; then
        if [ -n "$(git status --porcelain)" ]; then
            print_warning "You have uncommitted changes."
            read -p "Continue with deployment? (y/N): " continue_choice
            if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
                print_status "Deployment cancelled."
                exit 0
            fi
        fi
    fi

    print_success "Pre-deployment checks completed"
}

# Deploy backend
deploy_backend() {
    print_header "DEPLOYING BACKEND"

    if [ -f "$BACKEND_SCRIPT" ]; then
        bash "$BACKEND_SCRIPT"
        if [ $? -eq 0 ]; then
            print_success "Backend deployment completed successfully"
            return 0
        else
            print_error "Backend deployment failed"
            return 1
        fi
    else
        print_error "Backend deployment script not found"
        return 1
    fi
}

# Deploy frontend
deploy_frontend() {
    print_header "DEPLOYING FRONTEND"

    if [ -f "$FRONTEND_SCRIPT" ]; then
        bash "$FRONTEND_SCRIPT"
        if [ $? -eq 0 ]; then
            print_success "Frontend deployment completed successfully"
            return 0
        else
            print_error "Frontend deployment failed"
            return 1
        fi
    else
        print_error "Frontend deployment script not found"
        return 1
    fi
}

# Full deployment
deploy_full() {
    print_header "FULL APPLICATION DEPLOYMENT"

    local backend_success=false
    local frontend_success=false

    # Deploy backend first
    if deploy_backend; then
        backend_success=true
    fi

    echo ""

    # Deploy frontend
    if deploy_frontend; then
        frontend_success=true
    fi

    # Summary
    print_header "DEPLOYMENT SUMMARY"

    if [ "$backend_success" = true ]; then
        print_success "✓ Backend deployment successful"
    else
        print_error "✗ Backend deployment failed"
    fi

    if [ "$frontend_success" = true ]; then
        print_success "✓ Frontend deployment successful"
    else
        print_error "✗ Frontend deployment failed"
    fi

    if [ "$backend_success" = true ] && [ "$frontend_success" = true ]; then
        print_success "🎉 Full deployment completed successfully!"
        show_post_deployment_info
        return 0
    else
        print_error "Deployment completed with errors. Please check the logs above."
        return 1
    fi
}

# Show post-deployment information
show_post_deployment_info() {
    print_header "POST-DEPLOYMENT INFORMATION"
    echo ""
    echo "Your Vessel Tracker application should now be running:"
    echo ""
    echo "Backend API:"
    echo "  - Default URL: http://localhost:4000"
    echo "  - Health check: http://localhost:4000/health (if implemented)"
    echo "  - API endpoints: http://localhost:4000/api/"
    echo ""
    echo "Frontend Web App:"
    echo "  - Default URL: http://localhost:5000"
    echo ""
    echo "Useful Commands:"
    echo "  - Check backend logs: tail -f backend/app.log"
    echo "  - Check frontend with PM2: pm2 logs vessel-tracker-web"
    echo "  - Stop backend service: sudo systemctl stop vessel-tracker"
    echo "  - Stop frontend with PM2: pm2 stop vessel-tracker-web"
    echo ""
    echo "Configuration Files:"
    echo "  - Backend config: backend/.env"
    echo "  - Frontend config: vessel-tracker-web/.env.local"
    echo "  - Nginx config: vessel-tracker-web/vessel-tracker-nginx.conf"
    echo ""
}

# Handle cleanup on script interruption
cleanup() {
    print_warning "Deployment interrupted. Cleaning up..."
    # Add any cleanup tasks here
    exit 1
}

# Main function
main() {
    # Set up trap for cleanup
    trap cleanup INT TERM

    print_header "VESSEL TRACKER DEPLOYMENT MANAGER"
    print_status "Script location: $SCRIPT_DIR"

    # Check scripts first
    check_scripts

    # Run pre-deployment checks
    pre_deployment_checks

    # Main menu loop
    while true; do
        echo ""
        show_options
        read -p "Please select an option (1-5): " choice

        case $choice in
            1)
                deploy_backend
                ;;
            2)
                deploy_frontend
                ;;
            3)
                deploy_full
                ;;
            4)
                show_requirements
                ;;
            5)
                print_status "Exiting deployment manager."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-5."
                ;;
        esac

        echo ""
        read -p "Press Enter to continue or Ctrl+C to exit..."
    done
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi