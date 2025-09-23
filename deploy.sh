#!/bin/bash

# Vessel Tracker Deployment Script
# This script builds and deploys the vessel tracker application to the insurtech server

set -e  # Exit on any error

echo "🚢 Starting Vessel Tracker Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="insurtech"
REMOTE_PATH="/home/ubuntu/vessel-tracker"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

# Step 1: Build Frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd $FRONTEND_DIR
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
cd ..

# Step 2: Build Backend (cross-compile for Linux)
echo -e "${BLUE}🔨 Building backend for Linux...${NC}"
cd $BACKEND_DIR
GOOS=linux GOARCH=amd64 go build -o vessel-tracker-linux
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi
cd ..

# Step 3: Stop PM2 process
echo -e "${BLUE}⏹️  Stopping PM2 process...${NC}"
ssh $SERVER "cd $REMOTE_PATH && pm2 stop vessel-tracker" || true

# Step 4: Deploy data files
echo -e "${BLUE}📊 Deploying data files...${NC}"
rsync -av $BACKEND_DIR/data/ $SERVER:$REMOTE_PATH/data/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data files deployed${NC}"
else
    echo -e "${RED}❌ Data deployment failed${NC}"
    exit 1
fi

# Step 5: Deploy frontend static files
echo -e "${BLUE}📤 Deploying frontend assets...${NC}"
rsync -av --delete $FRONTEND_DIR/out/ $SERVER:$REMOTE_PATH/static/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend assets deployed${NC}"
else
    echo -e "${RED}❌ Frontend deployment failed${NC}"
    exit 1
fi

# Step 6: Deploy backend binary
echo -e "${BLUE}📤 Deploying backend binary...${NC}"
scp $BACKEND_DIR/vessel-tracker-linux $SERVER:$REMOTE_PATH/vessel-tracker
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend binary deployed${NC}"
else
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
fi

# Step 7: Start PM2 process
echo -e "${BLUE}▶️  Starting PM2 process...${NC}"
ssh $SERVER "cd $REMOTE_PATH && pm2 start vessel-tracker"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 process started${NC}"
else
    echo -e "${RED}❌ Failed to start PM2 process${NC}"
    exit 1
fi

# Step 8: Check application status
echo -e "${BLUE}🔍 Checking application status...${NC}"
sleep 3
ssh $SERVER "curl -s http://localhost:8080/api/health" | grep -q "healthy"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application is healthy and running${NC}"
else
    echo -e "${YELLOW}⚠️  Application health check inconclusive${NC}"
fi

# Step 9: Show PM2 status
echo -e "${BLUE}📊 PM2 Status:${NC}"
ssh $SERVER "pm2 status"

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Your vessel tracker is available at:${NC}"
echo -e "${GREEN}  • https://bfs.terraboxapp.com${NC}"
echo -e "${GREEN}  • https://blueforestsentinel.terraboxapp.com${NC}"
echo -e "${BLUE}  • http://$(ssh $SERVER 'curl -s ifconfig.me'):8080 (direct)${NC}"
echo ""
echo -e "${YELLOW}Management commands:${NC}"
echo -e "${YELLOW}  • View logs: ssh $SERVER 'pm2 logs vessel-tracker'${NC}"
echo -e "${YELLOW}  • Restart: ssh $SERVER 'pm2 restart vessel-tracker'${NC}"
echo -e "${YELLOW}  • Stop: ssh $SERVER 'pm2 stop vessel-tracker'${NC}"
echo -e "${YELLOW}  • Nginx status: ssh $SERVER 'sudo systemctl status nginx'${NC}"
echo -e "${YELLOW}  • Reload nginx: ssh $SERVER 'sudo systemctl reload nginx'${NC}"