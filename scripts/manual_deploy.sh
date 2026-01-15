#!/bin/bash

# Configuration
# Replace with your actual server IP or Hostname
SERVER_HOST="verifydev.me" 
SERVER_USER="azureuser"
BRANCH="dev"

echo "🚀 Starting Manual Deployment to $SERVER_HOST..."

ssh $SERVER_USER@$SERVER_HOST << EOF
  set -e

  echo "🧹 Cleaning up old directories..."
  # Deleting both folders as requested
  rm -rf ~/verifydev
  rm -rf ~/verifydev-backend

  echo "📂 Creating fresh directory..."
  mkdir -p ~/verifydev-backend
  cd ~/verifydev-backend

  echo "⬇️ Cloning repository ($BRANCH branch)..."
  # Using HTTPS for public/easy access, or setup SSH keys on server if private
  git clone -b $BRANCH https://github.com/verifydev-me/backend.git .

  echo "⚙️ Setting up Environment..."
  # IMPORTANT: You need to make sure .env exists!
  # If you have it in a secure location on server, copy it here.
  # Otherwise, create it manually or use a secret manager.
  if [ -f ~/.env.production ]; then
      cp ~/.env.production .env
      echo "✅ Loaded .env from ~/.env.production"
  else
      echo "⚠️  WARNING: .env file missing! You must create it."
      touch .env
  fi

  echo "🐳 Building and Starting containers..."
  docker-compose down || true
  docker-compose pull
  docker-compose up -d --build

  echo "✨ Deployment Complete!"
  docker-compose ps
EOF
