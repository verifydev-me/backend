# CI/CD Deployment Guide - Azure (Dev Branch)

## Overview
This document describes the automated CI/CD pipeline for deploying the VerifyDev backend to Azure from the `dev` branch.

## GitHub Secrets Configuration

The following secrets are required in your GitHub repository settings:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `BACKEND_ENV_FILE` | Complete .env file content with all environment variables | See `.env.example` |
| `HOST` | Azure VM IP address or hostname | `20.123.45.67` or `verifydev.azure.com` |
| `SSH_PRIVATE_KEY` | Private SSH key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `USERNAME` | SSH username for Azure VM | `azureuser` or `ubuntu` |

### Setting up GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact names listed above

## Workflow Triggers

The deployment workflow triggers on:

1. **Push to dev branch**: Automatically deploys when code is pushed to `dev`
2. **Manual trigger**: Can be manually triggered from GitHub Actions tab

## Deployment Process

### Step-by-Step Flow

1. **Checkout Code**: Pulls the latest code from the `dev` branch
2. **Setup SSH**: Configures SSH authentication using the private key
3. **Create .env File**: Deploys environment variables to the server
4. **Deploy Application**:
   - Clones/updates the repository on Azure VM
   - Stops existing containers
   - Cleans up old Docker images
   - Builds and starts all services using docker-compose
   - Waits for services to stabilize
5. **Verify Deployment**: Checks if all services are running
6. **Health Check**: Validates critical services are healthy

### Services Deployed

The following services are deployed:

- **Gateway** (Nginx) - Port 8000
- **Auth Service** - Port 3001
- **User Service** - Port 3002
- **Job Service** - Port 3004
- **Recruiter Service** - Port 3005
- **Project Analyzer** (Go) - Port 8001
- **Resume Service** (Go) - Port 8003
- **Aura Processor**
- **Redis** - Port 6379
- **RabbitMQ** - Ports 5672, 15672

## Server Requirements

### Azure VM Specifications

**Minimum Requirements:**
- OS: Ubuntu 20.04 LTS or later
- RAM: 8GB minimum (16GB recommended)
- CPU: 4 cores minimum
- Storage: 50GB minimum
- Docker & Docker Compose installed

### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create project directory
mkdir -p ~/verifydev-backend
cd ~/verifydev-backend

# Configure firewall (if using ufw)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # Gateway
sudo ufw enable
```

### SSH Key Setup

```bash
# On your local machine, generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@verifydev"

# Copy public key to Azure VM
ssh-copy-id username@your-azure-host

# Add private key to GitHub Secrets as SSH_PRIVATE_KEY
cat ~/.ssh/id_rsa  # Copy this content
```

## Environment Variables

Create a `BACKEND_ENV_FILE` secret with the following structure:

```env
# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-32-chars-minimum
JWT_REFRESH_SECRET=your-super-secret-refresh-key-32-chars-minimum

# GitHub OAuth
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/verifydev

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Frontend URLs
FRONTEND_URL=https://verifydev.me
ALLOWED_ORIGINS=https://verifydev.me,https://www.verifydev.me,https://api.verifydev.me

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://api.verifydev.me/api/v1/auth/github/callback
```

## Monitoring Deployment

### View Workflow Status

1. Go to **Actions** tab in your GitHub repository
2. Click on the latest workflow run
3. Monitor each step's progress and logs

### Check Deployment on Server

```bash
# SSH into Azure VM
ssh username@your-azure-host

# Navigate to project directory
cd ~/verifydev-backend

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f gateway
docker-compose logs -f auth-service

# Check resource usage
docker stats
```

## Troubleshooting

### Common Issues

#### 1. SSH Connection Failed
```bash
# Verify SSH key is correct
ssh -i ~/.ssh/id_rsa username@host

# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

#### 2. Services Not Starting
```bash
# Check logs for specific service
docker-compose logs service-name

# Restart specific service
docker-compose restart service-name

# Rebuild and restart
docker-compose up -d --build service-name
```

#### 3. Out of Disk Space
```bash
# Clean up Docker resources
docker system prune -a -f
docker volume prune -f

# Check disk usage
df -h
du -sh ~/verifydev-backend/*
```

#### 4. Port Already in Use
```bash
# Find process using port
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>

# Or stop all containers and restart
docker-compose down
docker-compose up -d
```

### Health Check Endpoints

- Gateway: `http://your-host:8000/health`
- Auth Service: `http://your-host:3001/health`
- User Service: `http://your-host:3002/health`

## Rollback Procedure

If deployment fails, you can rollback:

```bash
# SSH into server
ssh username@your-azure-host
cd ~/verifydev-backend

# Checkout previous commit
git log --oneline -n 10  # Find previous working commit
git checkout <commit-hash>

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into server
ssh username@your-azure-host
cd ~/verifydev-backend

# Pull latest changes
git checkout dev
git pull origin dev

# Deploy
docker-compose down
docker-compose up -d --build

# Verify
docker-compose ps
docker-compose logs -f
```

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate SSH keys** regularly
3. **Use strong JWT secrets** (minimum 32 characters)
4. **Enable firewall** on Azure VM
5. **Keep Docker images updated**
6. **Monitor logs** for suspicious activity
7. **Use HTTPS** in production
8. **Restrict SSH access** to specific IPs if possible

## Performance Optimization

### Docker Build Cache
The workflow uses Docker BuildKit for faster builds:
```yaml
env:
  DOCKER_BUILDKIT: 1
  COMPOSE_DOCKER_CLI_BUILD: 1
```

### Resource Limits
Consider adding resource limits in docker-compose.yml:
```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Maintenance

### Regular Tasks

1. **Weekly**: Check logs for errors
2. **Monthly**: Update Docker images
3. **Quarterly**: Review and rotate secrets
4. **As needed**: Scale resources based on usage

### Backup Strategy

```bash
# Backup MongoDB (if using local instance)
mongodump --uri="your-mongodb-uri" --out=/backup/$(date +%Y%m%d)

# Backup Docker volumes
docker run --rm -v verifydev_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data
```

## Support

For issues or questions:
- Check GitHub Actions logs
- Review server logs: `docker-compose logs`
- Check this documentation
- Contact DevOps team

## Changelog

- **2026-01-12**: Initial CI/CD pipeline setup for dev branch deployment to Azure
