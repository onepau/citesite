#!/bin/bash

# CiteSite Cloudflare Deployment Script
# This script deploys all workers and manages secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CiteSite Cloudflare Deployment Tool   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ Wrangler not found. Install with: npm install -g @cloudflare/wrangler${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Wrangler CLI found${NC}"
echo ""

# Main menu
echo -e "${YELLOW}Choose an action:${NC}"
echo "1) Set up all secrets"
echo "2) Deploy all workers"
echo "3) Initialize D1 database"
echo "4) Full deployment (secrets + deploy + DB)"
echo "5) List current secrets"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Setting up Stripe secrets...${NC}"
        read -sp "Enter STRIPE_SECRET_KEY (sk_test_...): " stripe_key
        echo ""
        echo "$stripe_key" | wrangler secret put STRIPE_SECRET_KEY
        echo -e "${GREEN}✓ STRIPE_SECRET_KEY set${NC}"

        read -sp "Enter STRIPE_WEBHOOK_SECRET (whsec_...): " webhook_secret
        echo ""
        echo "$webhook_secret" | wrangler secret put STRIPE_WEBHOOK_SECRET
        echo -e "${GREEN}✓ STRIPE_WEBHOOK_SECRET set${NC}"

        echo ""
        echo -e "${YELLOW}Setting up Anthropic API key...${NC}"
        read -sp "Enter ANTHROPIC_API_KEY (sk-ant-...): " anthropic_key
        echo ""
        echo "$anthropic_key" | wrangler secret put ANTHROPIC_API_KEY
        echo -e "${GREEN}✓ ANTHROPIC_API_KEY set${NC}"

        echo ""
        echo -e "${YELLOW}Setting up admin key...${NC}"
        read -p "Enter ADMIN_KEY (random string): " admin_key
        echo "$admin_key" | wrangler secret put ADMIN_KEY
        echo -e "${GREEN}✓ ADMIN_KEY set${NC}"

        echo ""
        echo -e "${GREEN}✓ All secrets configured!${NC}"
        ;;

    2)
        echo ""
        echo -e "${YELLOW}Deploying workers...${NC}"
        echo ""

        echo -e "${BLUE}→ Deploying audit-api...${NC}"
        cd workers/audit-api && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-api deployed${NC}"

        echo ""
        echo -e "${BLUE}→ Deploying checkout...${NC}"
        cd workers/checkout && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-checkout deployed${NC}"

        echo ""
        echo -e "${BLUE}→ Deploying stripe-webhook...${NC}"
        cd workers/stripe-webhook && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-webhook deployed${NC}"

        echo ""
        echo -e "${BLUE}→ Deploying oauth-proxy...${NC}"
        cd workers/oauth-proxy && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-oauth deployed${NC}"

        echo ""
        echo -e "${GREEN}✓ All workers deployed!${NC}"
        ;;

    3)
        echo ""
        echo -e "${YELLOW}Initializing D1 database...${NC}"
        echo ""
        npx wrangler d1 execute citesite-db --file workers/db/orders.sql
        echo ""
        echo -e "${GREEN}✓ Database schema initialized!${NC}"
        echo ""
        echo -e "${BLUE}Verifying tables:${NC}"
        npx wrangler d1 execute citesite-db --command "SELECT name FROM sqlite_master WHERE type='table';"
        ;;

    4)
        echo ""
        echo -e "${YELLOW}Running full deployment...${NC}"
        echo ""

        # Set secrets
        echo -e "${BLUE}Step 1: Setting up secrets${NC}"
        read -sp "Enter STRIPE_SECRET_KEY (sk_test_...): " stripe_key
        echo ""
        echo "$stripe_key" | wrangler secret put STRIPE_SECRET_KEY

        read -sp "Enter STRIPE_WEBHOOK_SECRET (whsec_...): " webhook_secret
        echo ""
        echo "$webhook_secret" | wrangler secret put STRIPE_WEBHOOK_SECRET

        read -sp "Enter ANTHROPIC_API_KEY (sk-ant-...): " anthropic_key
        echo ""
        echo "$anthropic_key" | wrangler secret put ANTHROPIC_API_KEY

        read -p "Enter ADMIN_KEY: " admin_key
        echo "$admin_key" | wrangler secret put ADMIN_KEY

        echo -e "${GREEN}✓ Secrets configured${NC}"
        echo ""

        # Initialize database
        echo -e "${BLUE}Step 2: Initializing database${NC}"
        npx wrangler d1 execute citesite-db --file workers/db/orders.sql
        echo -e "${GREEN}✓ Database initialized${NC}"
        echo ""

        # Deploy workers
        echo -e "${BLUE}Step 3: Deploying workers${NC}"
        cd workers/audit-api && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-api deployed${NC}"

        cd workers/checkout && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-checkout deployed${NC}"

        cd workers/stripe-webhook && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-webhook deployed${NC}"

        cd workers/oauth-proxy && wrangler publish && cd - > /dev/null
        echo -e "${GREEN}✓ citesite-oauth deployed${NC}"

        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✓ Full Deployment Complete!          ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Update Stripe webhook endpoint: https://webhook.citesite.net/"
        echo "2. Update frontend API_BASE in src/App.jsx"
        echo "3. Deploy frontend: npm run build && npx wrangler pages publish dist"
        ;;

    5)
        echo ""
        echo -e "${YELLOW}Current secrets:${NC}"
        npx wrangler secret list
        ;;

    6)
        echo "Exiting..."
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
