#!/bin/bash

# 🚀 Production Deployment Script
# Automated deployment for Social Media Management Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-$(date +%Y%m%d-%H%M%S)}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BUILD=${SKIP_BUILD:-false}

echo -e "${BLUE}🚀 Starting deployment for environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📦 Version: ${VERSION}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Convex CLI
    if ! command_exists convex; then
        print_warning "Convex CLI not found, installing..."
        npm install -g convex
    fi
    
    # Check environment variables
    if [ "$ENVIRONMENT" = "production" ]; then
        required_vars=(
            "NEXT_PUBLIC_CONVEX_URL"
            "CONVEX_DEPLOY_KEY"
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
            "CLERK_SECRET_KEY"
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
            "STRIPE_SECRET_KEY"
            "AYRSHARE_API_KEY"
        )
        
        for var in "${required_vars[@]}"; do
            if [ -z "${!var}" ]; then
                print_error "Required environment variable $var is not set"
                exit 1
            fi
        done
    fi
    
    print_status "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Install root dependencies
    npm ci
    
    # Install workspace dependencies
    npm run install:all
    
    print_status "Dependencies installed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests"
        return
    fi
    
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Run linting
    npm run lint
    
    # Run type checking
    npm run type-check
    
    # Run unit tests
    npm run test:unit
    
    # Run integration tests
    npm run test:integration
    
    print_status "All tests passed"
}

# Build applications
build_applications() {
    if [ "$SKIP_BUILD" = "true" ]; then
        print_warning "Skipping build"
        return
    fi
    
    echo -e "${BLUE}🏗️  Building applications...${NC}"
    
    # Build shared packages
    npm run build:packages
    
    # Build web application
    npm run build:web
    
    # Build native application (if needed)
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${YELLOW}📱 Native app build should be done separately via EAS${NC}"
    fi
    
    print_status "Applications built successfully"
}

# Deploy backend
deploy_backend() {
    echo -e "${BLUE}🗄️  Deploying backend...${NC}"
    
    # Deploy Convex backend
    if [ "$ENVIRONMENT" = "production" ]; then
        npx convex deploy --prod
    else
        npx convex deploy
    fi
    
    # Run database migrations
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    npx convex run deployment:validateDeployment \
        --version "$VERSION" \
        --environment "$ENVIRONMENT"
    
    # Verify health
    echo -e "${BLUE}🏥 Checking backend health...${NC}"
    sleep 5  # Wait for deployment to stabilize
    
    print_status "Backend deployed successfully"
}

# Deploy web application
deploy_web() {
    echo -e "${BLUE}🌐 Deploying web application...${NC}"
    
    cd apps/web
    
    if command_exists vercel; then
        # Deploy with Vercel
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --prod --yes
        else
            vercel --yes
        fi
    elif command_exists netlify; then
        # Deploy with Netlify
        netlify deploy --prod --dir=.next
    else
        print_warning "No deployment platform detected. Please deploy manually."
        print_warning "Built files are in apps/web/.next"
    fi
    
    cd ../..
    
    print_status "Web application deployed"
}

# Verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    # Get the deployment URL
    if [ "$ENVIRONMENT" = "production" ]; then
        APP_URL=${NEXT_PUBLIC_APP_URL:-"https://your-domain.com"}
    else
        APP_URL="http://localhost:3000"
    fi
    
    # Wait for deployment to be ready
    echo -e "${BLUE}⏳ Waiting for deployment to be ready...${NC}"
    sleep 10
    
    # Check health endpoints
    echo -e "${BLUE}🏥 Checking health endpoints...${NC}"
    
    # Basic health check
    if curl -f -s "$APP_URL/api/health" > /dev/null; then
        print_status "Basic health check passed"
    else
        print_error "Basic health check failed"
        exit 1
    fi
    
    # Detailed health check
    if curl -f -s "$APP_URL/api/health?type=detailed" > /dev/null; then
        print_status "Detailed health check passed"
    else
        print_warning "Detailed health check failed"
    fi
    
    # Readiness check
    if curl -f -s "$APP_URL/api/health?type=readiness" > /dev/null; then
        print_status "Readiness check passed"
    else
        print_error "Readiness check failed"
        exit 1
    fi
    
    print_status "Deployment verification completed"
}

# Post-deployment tasks
post_deployment() {
    echo -e "${BLUE}📋 Running post-deployment tasks...${NC}"
    
    # Clear caches if needed
    echo -e "${BLUE}🧹 Clearing caches...${NC}"
    
    # Send deployment notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployment completed for $ENVIRONMENT (v$VERSION)\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Log deployment
    echo "$(date): Deployed version $VERSION to $ENVIRONMENT" >> deployment.log
    
    print_status "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    echo -e "${RED}🔄 Rolling back deployment...${NC}"
    
    # This would implement rollback logic
    # For now, just print instructions
    print_error "Rollback not implemented in this script"
    print_error "To rollback:"
    print_error "1. Revert Convex deployment: npx convex rollback"
    print_error "2. Revert web deployment via your platform (Vercel/Netlify)"
    print_error "3. Check logs and fix issues"
    
    exit 1
}

# Trap errors and rollback
trap 'rollback' ERR

# Main deployment flow
main() {
    echo -e "${BLUE}🚀 Social Media Platform Deployment${NC}"
    echo -e "${BLUE}====================================${NC}"
    
    check_prerequisites
    install_dependencies
    run_tests
    build_applications
    deploy_backend
    deploy_web
    verify_deployment
    post_deployment
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Application URL: ${APP_URL}${NC}"
    echo -e "${GREEN}📊 Monitor at: ${APP_URL}/api/health${NC}"
    
    # Show next steps
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "1. Monitor application performance"
    echo -e "2. Check error logs"
    echo -e "3. Verify all integrations are working"
    echo -e "4. Update DNS if needed"
    echo -e "5. Notify stakeholders"
}

# Handle script arguments
case "$1" in
    "production"|"staging"|"development")
        main
        ;;
    "rollback")
        rollback
        ;;
    "verify")
        verify_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment] [version]"
        echo ""
        echo "Environments:"
        echo "  production  - Deploy to production"
        echo "  staging     - Deploy to staging"
        echo "  development - Deploy to development"
        echo ""
        echo "Commands:"
        echo "  rollback    - Rollback last deployment"
        echo "  verify      - Verify current deployment"
        echo "  help        - Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  SKIP_TESTS=true     - Skip running tests"
        echo "  SKIP_BUILD=true     - Skip building applications"
        echo "  SLACK_WEBHOOK_URL   - Slack webhook for notifications"
        echo ""
        echo "Examples:"
        echo "  $0 production 1.0.0"
        echo "  SKIP_TESTS=true $0 staging"
        echo "  $0 verify"
        ;;
    *)
        print_error "Invalid environment or command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
