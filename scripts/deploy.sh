#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if [ ! -d .git ]; then
  echo "❌ Not a git repository. Initializing..."
  git init
  git add .
  git commit -m "Initial commit"
fi

# Add all changes
echo "📦 Adding all changes..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "ℹ️  No changes to commit"
else
  # Commit changes
  echo "💾 Committing changes..."
  git commit -m "AI Music Video Backend - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to remote
echo "📤 Pushing to remote..."
if git remote | grep -q origin; then
  git push origin main || git push origin master
else
  echo "⚠️  No remote configured. Skipping push."
  echo "   Add a remote with: git remote add origin <url>"
fi

# Deploy to Vercel if installed
if command -v vercel &> /dev/null; then
  echo "🌐 Deploying to Vercel..."
  cd backend
  vercel deploy --prod
  cd ..
  echo "✅ Deployment complete!"
else
  echo "⚠️  Vercel CLI not installed. Skipping Vercel deployment."
  echo "   Install with: npm install -g vercel"
fi

echo "🎉 Process complete!"
