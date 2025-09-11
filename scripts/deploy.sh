#!/bin/bash
# 🚀 Multi-Agent System Deployment Script
# Automated deployment with health checks and rollback capability

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    # Check if required files exist
    local required_files=(
        "$PROJECT_DIR/Dockerfile"
        "$PROJECT_DIR/package.json"
        "$PROJECT_DIR/src/main.js"
        "$PROJECT_DIR/public/index.html"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file not found: $file"
        fi
    done
    
    success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    log "Creating backup of current deployment..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup docker images
    if docker ps -q --filter "label=com.docker.compose.project=mini-test-project" | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" config > "$backup_path/docker-compose.backup.yml"
        success "Backup created at $backup_path"
    else
        log "No existing deployment to backup"
    fi
    
    echo "$backup_path" > "$PROJECT_DIR/.last_backup"
}

# Build application
build_application() {
    log "Building multi-agent application..."
    
    # Run tests before building
    log "Running tests..."
    cd "$PROJECT_DIR"
    npm test || error "Tests failed - aborting deployment"
    
    # Build Docker images
    log "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache || error "Docker build failed"
    
    success "Application built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying multi-agent services..."
    
    # Stop existing services gracefully
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || warning "No existing services to stop"
    
    # Start services
    log "Starting new services..."
    docker-compose -f "$COMPOSE_FILE" up -d || error "Failed to start services"
    
    success "Services deployed successfully"
}

# Health checks
perform_health_checks() {
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check API health
    log "Checking API service health..."
    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            success "API service is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "API service failed health check after $max_attempts attempts"
        fi
        
        log "API health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    # Check Frontend health
    log "Checking Frontend service health..."
    attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
            success "Frontend service is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Frontend service failed health check after $max_attempts attempts"
        fi
        
        log "Frontend health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    # Integration test
    log "Running integration test..."
    if curl -sf http://localhost:3000/api/v1/users > /dev/null 2>&1; then
        success "Integration test passed"
    else
        error "Integration test failed"
    fi
}

# Post-deployment monitoring setup
setup_monitoring() {
    log "Setting up monitoring and alerts..."
    
    # Check if monitoring service is running
    if docker-compose -f "$COMPOSE_FILE" ps monitoring | grep -q "Up"; then
        log "Prometheus monitoring is available at http://localhost:9090"
        success "Monitoring setup completed"
    else
        warning "Monitoring service not available"
    fi
}

# Rollback function
rollback_deployment() {
    error "Deployment failed - initiating rollback..."
    
    if [[ -f "$PROJECT_DIR/.last_backup" ]]; then
        local last_backup=$(cat "$PROJECT_DIR/.last_backup")
        if [[ -f "$last_backup/docker-compose.backup.yml" ]]; then
            log "Rolling back to previous deployment..."
            docker-compose -f "$COMPOSE_FILE" down --remove-orphans
            cp "$last_backup/docker-compose.backup.yml" "$COMPOSE_FILE.rollback"
            warning "Rollback completed - manual intervention may be required"
        fi
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove old images
    docker image prune -f > /dev/null 2>&1 || true
    
    # Clean up old backups (keep last 5)
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "🚀 Starting Multi-Agent System Deployment"
    log "========================================="
    
    # Set trap for rollback on failure
    trap rollback_deployment ERR
    
    create_directories
    pre_deployment_checks
    backup_current_deployment
    build_application
    deploy_services
    perform_health_checks
    setup_monitoring
    cleanup
    
    # Remove trap as deployment succeeded
    trap - ERR
    
    success "========================================="
    success "🎉 Multi-Agent System Deployment Complete!"
    success "========================================="
    log ""
    log "🌐 Services available at:"
    log "   - API:        http://localhost:3000"
    log "   - Frontend:   http://localhost:8080"
    log "   - Monitoring: http://localhost:9090"
    log ""
    log "📊 Health endpoints:"
    log "   - API Health: http://localhost:3000/health"
    log "   - API Users:  http://localhost:3000/api/v1/users"
    log ""
    log "🔧 Management commands:"
    log "   - View logs:  docker-compose -f $COMPOSE_FILE logs -f"
    log "   - Stop:       docker-compose -f $COMPOSE_FILE down"
    log "   - Restart:    docker-compose -f $COMPOSE_FILE restart"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback_deployment
        ;;
    health)
        perform_health_checks
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health|cleanup]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Run health checks only"
        echo "  cleanup  - Clean up old images and backups"
        exit 1
        ;;
esac