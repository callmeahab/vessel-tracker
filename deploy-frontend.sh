#!/bin/bash

# Vessel Tracker Frontend Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="vessel-tracker-web"
BUILD_DIR="out"
NODE_VERSION="18"
PM2_APP_NAME="vessel-tracker-web"

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

# Check if Node.js is installed and version
check_node() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js $NODE_VERSION or later."
        exit 1
    fi

    NODE_CURRENT_VERSION=$(node -v | sed 's/v//')
    print_success "Node.js version: $NODE_CURRENT_VERSION"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi

    NPM_VERSION=$(npm -v)
    print_success "npm version: $NPM_VERSION"
}

# Change to frontend directory
cd_frontend() {
    print_status "Changing to frontend directory..."
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    cd "$FRONTEND_DIR"
    print_success "Changed to frontend directory"
}

# Check environment file
check_env() {
    print_status "Checking environment configuration..."

    # Check for Next.js environment files
    ENV_FILES=(".env.local" ".env.production" ".env")
    ENV_FOUND=false

    for env_file in "${ENV_FILES[@]}"; do
        if [ -f "$env_file" ]; then
            print_success "Environment file found: $env_file"
            ENV_FOUND=true
        fi
    done

    if [ "$ENV_FOUND" = false ]; then
        print_warning "No environment files found. Creating .env.local template..."
        cat > .env.local << EOF
# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Production settings
NODE_ENV=production
PORT=5000
EOF
        print_warning "Please configure .env.local with your settings before deploying."
    fi
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."

    # Check if package-lock.json exists
    if [ -f "package-lock.json" ]; then
        print_status "Using npm ci for faster, reliable installs..."
        npm ci
    else
        print_status "Using npm install..."
        npm install
    fi

    print_success "Dependencies installed successfully"
}

# Run linting
run_lint() {
    print_status "Running linter..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found. Continuing with deployment..."
    fi
}

# Build the application
build_app() {
    print_status "Building Next.js application..."

    # Set production environment
    export NODE_ENV=production

    # Build the application
    npm run build

    if [ $? -eq 0 ]; then
        print_success "Application built successfully"

        # Show build output info
        if [ -d ".next" ]; then
            print_status "Build output directory: .next"
            du -sh .next 2>/dev/null || true
        fi
    else
        print_error "Build failed"
        exit 1
    fi
}

# Export static files (if needed for static hosting)
export_static() {
    print_status "Checking if static export is configured..."

    # Check if next.config.js has static export configuration
    if grep -q "output.*export" next.config.js 2>/dev/null; then
        print_status "Static export configured. Exporting..."
        npm run build

        if [ -d "$BUILD_DIR" ]; then
            print_success "Static files exported to: $BUILD_DIR"
            du -sh "$BUILD_DIR" 2>/dev/null || true
        fi
    else
        print_status "No static export configuration found. Using standard Next.js build."
    fi
}

# Check PM2 for process management
check_pm2() {
    print_status "Checking PM2 for process management..."
    if command -v pm2 &> /dev/null; then
        print_success "PM2 is available"
        return 0
    else
        print_warning "PM2 not found. Install with: npm install -g pm2"
        return 1
    fi
}

# Create PM2 ecosystem file
create_pm2_config() {
    print_status "Creating PM2 ecosystem file..."

    CURRENT_DIR=$(pwd)

    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$CURRENT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

    print_success "PM2 ecosystem file created: ecosystem.config.js"
}

# Start application with PM2
start_with_pm2() {
    print_status "Starting application with PM2..."

    # Stop existing process if running
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

    # Start with ecosystem file
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    print_success "Application started with PM2"
    print_status "Use 'pm2 status' to check application status"
    print_status "Use 'pm2 logs $PM2_APP_NAME' to view logs"
}

# Start application normally
start_normal() {
    print_status "Starting application..."
    print_status "To start the application manually:"
    print_status "  npm start"
    print_status "  or"
    print_status "  NODE_ENV=production npm start"
    print_status ""
    print_status "The application will be available at http://localhost:5000"
}

# Create Nginx configuration template
create_nginx_config() {
    print_status "Creating Nginx configuration template..."

    cat > vessel-tracker-nginx.conf << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Serve static files
    location /_next/static/ {
        alias /path/to/vessel-tracker-web/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy everything else to Next.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    print_success "Nginx configuration created: vessel-tracker-nginx.conf"
    print_status "To use:"
    print_status "1. Copy to /etc/nginx/sites-available/"
    print_status "2. Create symlink to /etc/nginx/sites-enabled/"
    print_status "3. Update server_name and paths"
    print_status "4. Test with: nginx -t"
    print_status "5. Reload: systemctl reload nginx"
}

# Main deployment function
main() {
    print_status "Starting Vessel Tracker Frontend Deployment"
    print_status "==========================================="

    # Store original directory
    ORIGINAL_DIR=$(pwd)

    # Run deployment steps
    check_node
    cd_frontend
    check_env
    install_deps

    # Ask if user wants to run linting
    read -p "Run linting? (y/N): " run_lint_choice
    if [[ $run_lint_choice =~ ^[Yy]$ ]]; then
        run_lint
    fi

    build_app
    export_static

    # Ask about process management
    if check_pm2; then
        read -p "Use PM2 for process management? (y/N): " use_pm2_choice
        if [[ $use_pm2_choice =~ ^[Yy]$ ]]; then
            create_pm2_config
            start_with_pm2
        else
            start_normal
        fi
    else
        start_normal
    fi

    # Ask if user wants Nginx configuration
    read -p "Create Nginx configuration template? (y/N): " create_nginx_choice
    if [[ $create_nginx_choice =~ ^[Yy]$ ]]; then
        create_nginx_config
    fi

    print_success "Frontend deployment completed successfully!"

    # Show final information
    print_status "Build artifacts:"
    print_status "  - Next.js build: .next/"
    if [ -d "$BUILD_DIR" ]; then
        print_status "  - Static export: $BUILD_DIR/"
    fi

    # Return to original directory
    cd "$ORIGINAL_DIR"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"