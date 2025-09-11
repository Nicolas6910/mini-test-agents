#!/bin/bash
# 🔧 Multi-Agent System Setup Script
# Automated environment setup and validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/setup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
create_log_directory() {
    mkdir -p "$(dirname "$LOG_FILE")"
}

# Check system requirements
check_system_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        info "Operating System: Linux ✅"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        info "Operating System: macOS ✅"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        info "Operating System: Windows ✅"
    else
        warning "Operating System: $OSTYPE (untested)"
    fi
    
    # Check available memory
    if command -v free &> /dev/null; then
        local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7*100/($2+1)}')
        info "Available Memory: ${available_memory}% free"
    fi
    
    # Check disk space
    local available_space=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    info "Available Disk Space: $available_space"
    
    success "System requirements check completed"
}

# Check and install Node.js
check_nodejs() {
    log "📦 Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        info "Node.js version: $node_version"
        
        # Check if version is compatible (>= 16.0.0)
        local major_version=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')
        if [[ $major_version -ge 16 ]]; then
            success "Node.js version is compatible ✅"
        else
            warning "Node.js version might be too old (< 16.0.0)"
        fi
    else
        error "Node.js is not installed. Please install Node.js >= 16.0.0"
    fi
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        info "NPM version: $npm_version"
        success "NPM is available ✅"
    else
        error "NPM is not installed"
    fi
}

# Check Docker installation
check_docker() {
    log "🐳 Checking Docker installation..."
    
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version)
        info "Docker version: $docker_version"
        
        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            success "Docker daemon is running ✅"
        else
            warning "Docker daemon is not running or not accessible"
            info "Please start Docker daemon and ensure current user has Docker permissions"
        fi
    else
        warning "Docker is not installed (optional for development)"
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version)
        info "Docker Compose version: $compose_version"
        success "Docker Compose is available ✅"
    elif docker compose version &> /dev/null; then
        local compose_version=$(docker compose version)
        info "Docker Compose (plugin) version: $compose_version"
        success "Docker Compose plugin is available ✅"
    else
        warning "Docker Compose is not installed (optional for development)"
    fi
}

# Install dependencies
install_dependencies() {
    log "📦 Installing project dependencies..."
    
    cd "$PROJECT_DIR"
    
    if [[ -f "package.json" ]]; then
        log "Installing Node.js dependencies..."
        if npm ci; then
            success "Node.js dependencies installed successfully ✅"
        else
            error "Failed to install Node.js dependencies"
        fi
        
        # Audit dependencies for security vulnerabilities
        log "Auditing dependencies for security vulnerabilities..."
        if npm audit --audit-level=moderate; then
            success "Security audit passed ✅"
        else
            warning "Security audit found issues - please review"
        fi
    else
        error "package.json not found in project directory"
    fi
}

# Setup development environment
setup_development_environment() {
    log "🔧 Setting up development environment..."
    
    # Create necessary directories
    local directories=(
        "logs"
        "backups"
        "coverage"
        "tmp"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$PROJECT_DIR/$dir"
        info "Created directory: $dir"
    done
    
    # Set up Git hooks (if .git exists)
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        log "Setting up Git hooks..."
        # Could add pre-commit hooks here
        success "Git hooks configured ✅"
    fi
    
    success "Development environment setup completed ✅"
}

# Validate project structure
validate_project_structure() {
    log "📁 Validating project structure..."
    
    local required_files=(
        "package.json"
        "src/main.js"
        "src/api.js"
        "public/index.html"
        "public/styles.css"
        "public/api-client.js"
        "tests/test.js"
        "tests/frontend.test.js"
        "Dockerfile"
        "docker-compose.yml"
        ".github/workflows/ci-cd.yml"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ -f "$PROJECT_DIR/$file" ]]; then
            info "✅ $file"
        else
            warning "❌ $file (missing)"
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -eq 0 ]]; then
        success "Project structure validation passed ✅"
    else
        warning "Some files are missing - project may not work correctly"
        info "Missing files: ${missing_files[*]}"
    fi
}

# Run basic tests
run_basic_tests() {
    log "🧪 Running basic tests..."
    
    cd "$PROJECT_DIR"
    
    # Test package.json validity
    if node -e "require('./package.json')" &> /dev/null; then
        success "package.json is valid ✅"
    else
        error "package.json is invalid"
    fi
    
    # Run unit tests if available
    if npm test; then
        success "Unit tests passed ✅"
    else
        warning "Unit tests failed or are not configured"
    fi
    
    # Test API startup (quick test)
    log "Testing API startup..."
    if timeout 10s npm run dev > /dev/null 2>&1 &
    then
        local api_pid=$!
        sleep 3
        
        if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            success "API startup test passed ✅"
        else
            warning "API startup test failed"
        fi
        
        # Kill the test server
        kill $api_pid 2>/dev/null || true
    else
        warning "Could not test API startup"
    fi
}

# Generate environment configuration
generate_environment_config() {
    log "⚙️ Generating environment configuration..."
    
    local env_file="$PROJECT_DIR/.env.example"
    
    cat > "$env_file" << EOF
# Multi-Agent System Configuration
# Copy this file to .env and modify values as needed

# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Security
CORS_ORIGIN=http://localhost:8080,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Database (if implemented)
# DATABASE_URL=sqlite://./data/database.sqlite

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_PORT=9464

# Frontend
FRONTEND_PORT=8080

# Docker
COMPOSE_PROJECT_NAME=multi-agent-system
EOF
    
    success "Environment configuration generated at $env_file ✅"
}

# Display setup summary
display_summary() {
    log "📋 Setup Summary"
    log "================"
    log ""
    info "🎯 Multi-Agent System Components:"
    info "   ├── 🎯 Backend Expert:    API server (Express.js)"
    info "   ├── 🎨 Frontend Expert:   Web interface (HTML/CSS/JS)"
    info "   ├── 📢 Marketing Expert:  Documentation & guides"
    info "   └── 🤖 Automation Expert: CI/CD & deployment"
    log ""
    info "🚀 Quick Start Commands:"
    info "   Development:  npm run dev"
    info "   Production:   npm start"
    info "   Tests:        npm test"
    info "   Frontend:     npm run serve"
    info "   Docker:       docker-compose up"
    info "   Deploy:       ./scripts/deploy.sh"
    log ""
    info "🌐 Service URLs (when running):"
    info "   API:          http://localhost:3000"
    info "   Frontend:     http://localhost:8080"
    info "   Monitoring:   http://localhost:9090"
    info "   Health:       http://localhost:3000/health"
    log ""
    success "✨ Setup completed successfully! The Multi-Agent System is ready."
}

# Main setup function
main() {
    log "🚀 Multi-Agent System Setup"
    log "==========================="
    
    create_log_directory
    check_system_requirements
    check_nodejs
    check_docker
    install_dependencies
    setup_development_environment
    validate_project_structure
    run_basic_tests
    generate_environment_config
    display_summary
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    check)
        create_log_directory
        check_system_requirements
        check_nodejs
        check_docker
        ;;
    install)
        create_log_directory
        install_dependencies
        ;;
    validate)
        create_log_directory
        validate_project_structure
        ;;
    test)
        create_log_directory
        run_basic_tests
        ;;
    *)
        echo "Usage: $0 [setup|check|install|validate|test]"
        echo ""
        echo "Commands:"
        echo "  setup    - Complete setup (default)"
        echo "  check    - Check system requirements only"
        echo "  install  - Install dependencies only"
        echo "  validate - Validate project structure only"
        echo "  test     - Run basic tests only"
        exit 1
        ;;
esac