#!/bin/bash
# Razum AI — Deployment script
# Deploys updated files to Mac Mini and restarts the app

set -e

SSH_KEY="$HOME/.ssh/id_ed25519_m4"
REMOTE="svyat@192.168.0.101"
REMOTE_DIR="~/razum-web/web-app"
LOCAL_DIR="$HOME/Downloads/Razum/web-app"

echo "========================================="
echo "  Razum AI — Deploy to Mac Mini"
echo "========================================="

# Step 1: Clean remote src and sync fresh
echo ""
echo "[1/5] Syncing source files..."
ssh -i $SSH_KEY $REMOTE "rm -rf $REMOTE_DIR/src"
scp -i $SSH_KEY -r "$LOCAL_DIR/src" "$REMOTE:$REMOTE_DIR/"
echo "  ✓ Source files synced"

# Step 2: Sync config files
echo ""
echo "[2/5] Syncing config & public files..."
scp -i $SSH_KEY "$LOCAL_DIR/package.json" "$REMOTE:$REMOTE_DIR/package.json"
scp -i $SSH_KEY "$LOCAL_DIR/next.config.js" "$REMOTE:$REMOTE_DIR/next.config.js"
scp -i $SSH_KEY "$LOCAL_DIR/.gitignore" "$REMOTE:$REMOTE_DIR/.gitignore"
scp -i $SSH_KEY "$LOCAL_DIR/.env.example" "$REMOTE:$REMOTE_DIR/.env.example"

# Copy .env.production as .env (only if .env doesn't exist on server)
ssh -i $SSH_KEY $REMOTE "test -f $REMOTE_DIR/.env || echo 'NO_ENV'" | grep -q "NO_ENV" && \
  scp -i $SSH_KEY "$LOCAL_DIR/.env.production" "$REMOTE:$REMOTE_DIR/.env" && \
  echo "  ✓ .env created on server" || echo "  ✓ .env already exists (not overwriting)"

# Sync public directory (favicon, robots.txt, sitemap, icons, sw.js, manifest)
scp -i $SSH_KEY -r "$LOCAL_DIR/public/" "$REMOTE:$REMOTE_DIR/public/"
echo "  ✓ Config & public files synced"

# Step 3: Install dependencies
echo ""
echo "[3/5] Installing dependencies..."
ssh -i $SSH_KEY $REMOTE "export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && cd $REMOTE_DIR && npm install"
echo "  ✓ Dependencies installed"

# Step 4: Build
echo ""
echo "[4/5] Building Next.js app..."
ssh -i $SSH_KEY $REMOTE "export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && cd $REMOTE_DIR && npm run build"
echo "  ✓ Build complete"

# Step 5: Restart with PM2
echo ""
echo "[5/5] Restarting with PM2..."
ssh -i $SSH_KEY $REMOTE "export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && cd $REMOTE_DIR && pm2 restart razum-web 2>/dev/null || pm2 start 'npx next start -p 3000' --name razum-web && pm2 save"
echo "  ✓ App restarted"

echo ""
echo "========================================="
echo "  ✓ Deploy complete!"
echo "  App: http://192.168.0.101:3000"
echo "========================================="
