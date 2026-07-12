#!/usr/bin/env bash
# ==============================================================================
# HACYBERGLOBAL™ - AUTOMATED CLOUD DEPLOYMENT CORE SUITE (V2.5.0)
# This script automates preparing, building, containerizing, and deploying
# the HGT Spark Bot app to Heroku, AWS ECS/App Runner, or Google Cloud Run.
# ==============================================================================

set -euo pipefail

# Visual brand log helper
log_success() { echo -e "\033[0;32m[SUCCESS] $1\033[0m"; }
log_info() { echo -e "\033[0;34m[INFO] $1\033[0m"; }
log_warn() { echo -e "\033[0;33m[WARNING] $1\033[0m"; }
log_error() { echo -e "\033[0;31m[ERROR] $1\033[0m"; }

clear
echo "======================================================================"
echo "    __  _________________ _____ _    _ _____  _      "
echo "   / / / / __/_  __/ ___// ___// |  / / ___/ / /      "
echo "  / /_/ / _/   / / / (_ // _ /  | | / / (_ / / /___   "
echo "  \\____/_/    /_/  \\___/ \\___/   |___/\\___/ /_____/   "
echo "                                                      "
echo "   HACYBERGLOBAL™ SPARK BOT CLOUD ENGINE DEPLOYER "
echo "======================================================================"
echo "This automation suite supports deploying to:"
echo "  1) Heroku (PaaS - Quick Git push and automatic SSL)"
echo "  2) Google Cloud Run (Serverless container deployment - High Performance)"
echo "  3) AWS Elastic Container Service / App Runner (Enterprise Scalability)"
echo "======================================================================"

read -p "Select a cloud service to generate deploy configurations (1-3): " choice

case $choice in
  1)
    echo ""
    log_info "Preparing deployment manifest for HEROKU..."
    
    # 1. Check for heroku CLI
    if ! command -v heroku &> /dev/null; then
      log_warn "Heroku CLI is not installed on this local system."
      log_warn "You can install it via: brew install heroku/brew/heroku (Mac) or npm install -g heroku"
    fi
    
    # Generate Heroku Procfile
    echo "web: npm run dev" > Procfile
    log_success "Successfully generated 'Procfile' for Heroku."
    
    # Generate instructions
    echo ""
    echo "------------------ HEROKU DEPLOYMENT SEQUENCE ------------------"
    echo "Run these commands in your local computer CLI:"
    echo "  1. heroku login"
    echo "  2. heroku create hgt-spark-bot-\$RANDOM"
    echo "  3. heroku config:set NODE_ENV=production"
    echo "  4. heroku config:set VITE_APP_DOMAIN=yourdomain.com"
    echo "  5. git add -A && git commit -m 'Configure cloud deployments' || true"
    echo "  6. git push heroku main"
    echo "----------------------------------------------------------------"
    ;;
    
  2)
    echo ""
    log_info "Preparing container configurations for GOOGLE CLOUD RUN..."
    
    # Create the Dockerfile if it does not exist
    cat << 'EOF' > Dockerfile
# Syntax-optimised Production Dockerfile Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
EOF
    log_success "Successfully created multi-stage 'Dockerfile' for production containerization."

    echo ""
    echo "---------------- GOOGLE CLOUD RUN DEPLOYMENT SEQUENCE ----------------"
    echo "Ensure you have the Google Cloud SDK ('gcloud') and billing enabled."
    echo "Run these commands in your computer CLI:"
    echo "  1. gcloud auth login"
    echo "  2. gcloud config set project [YOUR_GCP_PROJECT_ID]"
    echo "  3. gcloud builds submit --tag gcr.io/[YOUR_GCP_PROJECT_ID]/hgt-spark-bot"
    echo "  4. gcloud run deploy hgt-spark-bot \\"
    echo "       --image gcr.io/[YOUR_GCP_PROJECT_ID]/hgt-spark-bot \\"
    echo "       --platform managed \\"
    echo "       --region us-central1 \\"
    echo "       --allow-unauthenticated \\"
    echo "       --port 3000"
    echo "------------------------------------------------------------------------"
    ;;

  3)
    echo ""
    log_info "Preparing configurations for AWS ECOSYSTEM (App Runner / ECS)..."
    
    # Re-use the Dockerfile matching AWS standards
    cat << 'EOF' > Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
EOF
    log_success "Successfully created generic container configuration 'Dockerfile'."

    # Write simple Copilot or codebuild yaml helper
    cat << 'EOF' > copilot-manifest.yml
# AWS Copilot app launch template
name: hgt-spark-bot
type: Request-Driven Web Service
image:
  build: Dockerfile
  port: 3000
cpu: 256
memory: 512
count: 1
http:
  path: '/'
variables:
  NODE_ENV: production
EOF
    log_success "Successfully generated AWS Copilot orchestration template 'copilot-manifest.yml'."

    echo ""
    echo "--------------------- AWS DEPLOYMENT OPTIONS ---------------------"
    echo "Option A: AWS App Runner (Easiest for container hosts)"
    echo "  1. Create a GitHub connection in AWS Console."
    echo "  2. Choose source -> Repository, click automatic deployment on push."
    echo "  3. Set Runtime: 'Docker', Port: '3000'. AWS compiles and delivers."
    echo ""
    echo "Option B: AWS ECR + Amazon Elastic Container Service (ECS)"
    echo "  1. aws ecr get-login-password --region us-east-1 | docker login..."
    echo "  2. docker build -t hgt-spark-bot ."
    echo "  3. docker tag hgt-spark-bot:latest [ECR_REPO_URL]:latest"
    echo "  4. docker push [ECR_REPO_URL]:latest"
    echo "------------------------------------------------------------------"
    ;;

  *)
    log_error "Invalid selection. Exiting deployment process..."
    exit 1
    ;;
esac

log_success "Active workspace prepared. Commit and push configuration files to trigger Cloud deploy pipeline hook."
